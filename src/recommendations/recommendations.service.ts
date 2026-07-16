import { Injectable } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';
import { Logger } from '@nestjs/common';

export interface RecommendedUser {
  id: string;
  username: string;
  full_handle: string;
  followers_count?: number;
  mutual_friends?: number;
  similarity_score?: number;
}

export interface RecommendedPost {
  id: string;
  content: string;
  author_id: string;
  author_username: string;
  created_at: string;
  likes_count: number;
  engagement_score?: number;
}

export interface RecommendationMetrics {
  userId: string;
  recommendedUsers: RecommendedUser[];
  recommendedPosts: RecommendedPost[];
  processingTimeMs: number;
  datasetSize: {
    totalUsers: number;
    totalPosts: number;
    totalFollows: number;
  };
}

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(private readonly neo4jService: Neo4jService) {}

  /**
   * Helper: Convert Neo4j value to number
   */
  private toNumber(value: any): number {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (value && typeof value?.toNumber === 'function') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      return value.toNumber();
    }
    return typeof value === 'number' ? value : 0;
  }

  /**
   * Helper: Safely get string value from record
   */
  private getString(value: any): string {
    return typeof value === 'string' ? value : '';
  }

  /**
   * Helper: Safely convert to string
   */
  private toString(value: any): string {
    if (value === null || value === undefined) return '';
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (typeof value?.toString === 'function') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      return value.toString();
    }
    return String(value);
  }

  /**
   * Get suggested follows for a user
   * Uses 2-hop traversal: User -> Follows -> User -> Follows -> Suggested
   * Weighted by number of mutual connections
   */
  async getSuggestedFollows(
    userId: string,
    limit: number = 10,
  ): Promise<RecommendedUser[]> {
    const query = `
      MATCH (user:User {id: $userId})
      MATCH (user)-[:FOLLOWS]->(f1:User)-[:FOLLOWS]->(suggested:User)
      WHERE NOT (user)-[:FOLLOWS]->(suggested) 
        AND suggested.id != user.id
        AND suggested.is_remote = false
      WITH suggested, COUNT(DISTINCT f1) as mutual_friends
      ORDER BY mutual_friends DESC, suggested.username ASC
      RETURN 
        suggested.id as id,
        suggested.username as username,
        suggested.full_handle as full_handle,
        mutual_friends
      LIMIT $limit
    `;

    try {
      const session = this.neo4jService.getSession();
      const result = await session.run(query, { userId, limit });

      return result.records.map((record) => {
        return {
          id: this.getString(record.get('id')),
          username: this.getString(record.get('username')),
          full_handle: this.getString(record.get('full_handle')),
          mutual_friends: this.toNumber(record.get('mutual_friends')),
        };
      });
    } catch (error) {
      this.logger.error(
        `Error fetching suggested follows for user ${userId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get suggested posts for a user
   * Recommends posts from:
   * - Users you follow (direct)
   * - Users your followers follow (indirect/trending)
   * Not including posts the user has already liked
   */
  async getSuggestedPosts(
    userId: string,
    limit: number = 20,
  ): Promise<RecommendedPost[]> {
    const query = `
      MATCH (user:User {id: $userId})
      
      // Direct posts from followed users
      OPTIONAL MATCH (user)-[:FOLLOWS]->(f1:User)-[:AUTHORED]->(post1:Post)
      WHERE NOT (user)-[:LIKES]->(post1)
      WITH user, post1, f1, 1 as engagement_weight
      
      UNION ALL
      
      // Indirect posts: posts from users your followers follow (trending)
      MATCH (user:User {id: $userId})
      MATCH (follower:User)-[:FOLLOWS]->(user)
      MATCH (follower)-[:FOLLOWS]->(f2:User)-[:AUTHORED]->(post2:Post)
      WHERE NOT (user)-[:LIKES]->(post2)
        AND post2.id NOT IN [post1.id]
      WITH user, post2 as post, f2, 0.5 as engagement_weight
      
      WITH post, engagement_weight, post.likes_count as likes
      WITH post, engagement_weight, likes, COUNT(*) as reach_score
      WITH post, engagement_weight, (likes * 1.0 * engagement_weight) + reach_score as engagement_score
      
      OPTIONAL MATCH (post)<-[:AUTHORED]-(author:User)
      RETURN 
        post.id as id,
        post.content as content,
        author.id as author_id,
        author.username as author_username,
        post.created_at as created_at,
        post.likes_count as likes_count,
        engagement_score
      ORDER BY engagement_score DESC, post.created_at DESC
      LIMIT $limit
    `;

    try {
      const session = this.neo4jService.getSession();
      const result = await session.run(query, { userId, limit });

      return result.records.map((record) => {
        return {
          id: this.getString(record.get('id')),
          content: this.getString(record.get('content')),
          author_id: this.getString(record.get('author_id')),
          author_username: this.getString(record.get('author_username')),
          created_at: this.getString(record.get('created_at')),
          likes_count: this.toNumber(record.get('likes_count')),
          engagement_score: parseFloat(
            this.toString(record.get('engagement_score')),
          ),
        };
      });
    } catch (error) {
      this.logger.error(
        `Error fetching suggested posts for user ${userId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Find users similar to the target user
   * Based on shared follow patterns (users you both follow)
   */
  async getSimilarUsers(
    userId: string,
    limit: number = 10,
  ): Promise<RecommendedUser[]> {
    const query = `
      MATCH (user:User {id: $userId})-[:FOLLOWS]->(common:User)<-[:FOLLOWS]-(similar:User)
      WHERE similar.id != user.id 
        AND NOT (user)-[:FOLLOWS]->(similar)
        AND similar.is_remote = false
      WITH similar, COUNT(DISTINCT common) as similarity_score
      ORDER BY similarity_score DESC, similar.username ASC
      RETURN 
        similar.id as id,
        similar.username as username,
        similar.full_handle as full_handle,
        similarity_score
      LIMIT $limit
    `;

    try {
      const session = this.neo4jService.getSession();
      const result = await session.run(query, { userId, limit });

      return result.records.map((record) => {
        return {
          id: this.getString(record.get('id')),
          username: this.getString(record.get('username')),
          full_handle: this.getString(record.get('full_handle')),
          similarity_score: this.toNumber(record.get('similarity_score')),
        };
      });
    } catch (error) {
      this.logger.error(
        `Error fetching similar users for user ${userId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get personalized feed for a user
   * Combines:
   * - Posts from directly followed users (weighted high)
   * - Posts trending in user's network (weighted medium)
   * - Recommended posts from similar users (weighted low)
   */
  async getPersonalizedFeed(
    userId: string,
    limit: number = 20,
  ): Promise<RecommendedPost[]> {
    const query = `
      MATCH (user:User {id: $userId})
      
      // Direct feed: posts from followed users (weight: 3.0)
      OPTIONAL MATCH (user)-[:FOLLOWS]->(followed:User)-[:AUTHORED]->(post:Post)
      OPTIONAL MATCH (post)<-[l:LIKES]-()
      WITH post, 3.0 as score_weight, COUNT(DISTINCT l) as likes, followed.username as author_username
      
      UNION ALL
      
      // Indirect feed: trending in extended network (weight: 2.0)
      MATCH (user:User {id: $userId})
      MATCH (user)-[:FOLLOWS]->(f1:User)-[:FOLLOWS]->(f2:User)-[:AUTHORED]->(post:Post)
      WHERE NOT (user)-[:FOLLOWS]->(f2)
      OPTIONAL MATCH (post)<-[l:LIKES]-()
      WITH post, 2.0 as score_weight, COUNT(DISTINCT l) as likes, f2.username as author_username
      
      UNION ALL
      
      // Recommendation: posts from similar users (weight: 1.0)
      MATCH (user:User {id: $userId})-[:FOLLOWS]->(common:User)<-[:FOLLOWS]-(similar:User)
      MATCH (similar)-[:AUTHORED]->(post:Post)
      WHERE NOT (user)-[:FOLLOWS]->(similar) AND NOT (user)-[:LIKES]->(post)
      OPTIONAL MATCH (post)<-[l:LIKES]-()
      WITH post, 1.0 as score_weight, COUNT(DISTINCT l) as likes, similar.username as author_username
      
      WITH DISTINCT post, score_weight, likes, author_username
      WITH post, 
        author_username,
        likes,
        score_weight * (1.0 + (likes * 0.1)) as final_score
      ORDER BY final_score DESC, post.created_at DESC
      
      RETURN 
        post.id as id,
        post.content as content,
        author_username,
        post.created_at as created_at,
        likes as likes_count,
        final_score as engagement_score
      LIMIT $limit
    `;

    try {
      const session = this.neo4jService.getSession();
      const result = await session.run(query, { userId, limit });

      return result.records.map((record) => {
        return {
          id: this.getString(record.get('id')),
          content: this.getString(record.get('content')),
          author_id: '',
          author_username: this.getString(record.get('author_username')),
          created_at: this.getString(record.get('created_at')),
          likes_count: this.toNumber(record.get('likes_count')),
          engagement_score: parseFloat(
            this.toString(record.get('engagement_score')),
          ),
        };
      });
    } catch (error) {
      this.logger.error(
        `Error fetching personalized feed for user ${userId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get complete recommendation set with metrics
   * Includes suggested users, posts, and processing time
   */
  async getCompleteRecommendations(
    userId: string,
  ): Promise<RecommendationMetrics> {
    const startTime = Date.now();

    // Get all recommendation types in parallel
    const [suggestedFollows, suggestedPosts, similarUsers, datasetSize] =
      await Promise.all([
        this.getSuggestedFollows(userId),
        this.getSuggestedPosts(userId),
        this.getSimilarUsers(userId),
        this.getDatasetSize(),
      ]);

    const processingTimeMs = Date.now() - startTime;

    return {
      userId,
      recommendedUsers: [...suggestedFollows, ...similarUsers],
      recommendedPosts: suggestedPosts,
      processingTimeMs,
      datasetSize,
    };
  }

  /**
   * Get dataset size (for metrics/performance tracking)
   */
  async getDatasetSize(): Promise<{
    totalUsers: number;
    totalPosts: number;
    totalFollows: number;
  }> {
    const query = `
      MATCH (u:User) WITH COUNT(u) as total_users
      MATCH (p:Post) WITH COUNT(p) as total_posts, total_users
      MATCH ()-[f:FOLLOWS]->() WITH COUNT(f) as total_follows, total_users, total_posts
      RETURN total_users, total_posts, total_follows
    `;

    try {
      const session = this.neo4jService.getSession();
      const result = await session.run(query);
      const record = result.records[0];

      return {
        totalUsers: this.toNumber(record.get('total_users')),
        totalPosts: this.toNumber(record.get('total_posts')),
        totalFollows: this.toNumber(record.get('total_follows')),
      };
    } catch (error) {
      this.logger.error('Error fetching dataset size', error);
      return { totalUsers: 0, totalPosts: 0, totalFollows: 0 };
    }
  }
}
