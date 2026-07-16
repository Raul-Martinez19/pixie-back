import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { randomUUID } from 'crypto';
import neo4j from 'neo4j-driver';
import { ConfigService } from '@nestjs/config';
import { Neo4jService } from 'src/neo4j/neo4j.service';
import { User } from 'src/user/entities/user.entity';
import { Post } from './entities/post.entity';
import { CreatePostDto } from './dto/create-post.dto';

interface Neo4jPostResult {
  post: {
    properties: Post;
  };
}

interface Neo4jPostWithLikesResult {
  post: {
    properties: Post;
  };
  likers: Array<{
    properties: User;
  }>;
}

@Injectable()
export class PostsService {
  constructor(
    private neo4jService: Neo4jService,
    private configService: ConfigService,
  ) { }

  async createPost(createPostDto: CreatePostDto, author: User): Promise<Post> {
    const cypher = `
        MATCH (author:User {full_handle: $authorHandle})
        CREATE (post:Post {
        id: $id,
        content: $content,
        author_handle: $authorHandle,
        is_remote: false,
        likes_count: 0,
        shares_count: 0,
        visibility: $visibility,
        created_at: datetime(),
        updated_at: datetime()
        })
        CREATE (author)-[:AUTHORED]->(post)
        RETURN post
        `;
    const postData = {
      id: randomUUID(),
      content: createPostDto.content,
      authorHandle: author.full_handle,
      visibility: createPostDto.visibility || 'public',
    };
    const result = (await this.neo4jService.runQuery(
      cypher,
      postData,
    )) as Neo4jPostResult[];

    // Safer type handling
    const postProperties = result[0]?.post?.properties;
    if (!postProperties?.id) {
      throw new Error('Failed to create post');
    }
    const post: Post = {
      ...postProperties,
      created_at: this.neo4jDateTimeToISO(postProperties.created_at),
    };
    return post;
  }

  private neo4jDateTimeToISO(dt: unknown): string {
    if (!dt) return new Date().toISOString();
    if (typeof dt === 'string') return dt;
    const d = dt as Record<string, unknown>;
    // Neo4j driver v6 with disableLosslessIntegers: true exposes plain numeric fields
    if (typeof d.year === 'number') {
      const p = (n: number) => String(n).padStart(2, '0');
      const ms = String(
        Math.floor(((d.nanosecond as number) ?? 0) / 1_000_000),
      ).padStart(3, '0');
      return `${d.year}-${p(d.month as number)}-${p(d.day as number)}T${p(d.hour as number)}:${p(d.minute as number)}:${p(d.second as number)}.${ms}Z`;
    }
    // Older driver versions
    const dtLegacy = d as {
      toStandardDate?: () => Date;
      toString?: () => string;
    };
    if (typeof dtLegacy.toStandardDate === 'function') {
      return dtLegacy.toStandardDate().toISOString();
    }
    if (typeof dtLegacy.toString === 'function') {
      const s = dtLegacy.toString();
      if (s !== '[object Object]') return s;
    }
    return new Date().toISOString();
  }

  async getFeed(userHandle: string, limit: number = 20): Promise<Post[]> {
    const cypher = `
      MATCH (user:User {full_handle: $userHandle})
      MATCH (source:User)-[:AUTHORED]->(post:Post)
      WHERE source.full_handle = $userHandle
         OR EXISTS {
           MATCH (user)-[:FOLLOWS {status: 'accepted'}]->(source)
         }
      OPTIONAL MATCH (user)-[liked:LIKES]->(post)
      RETURN post AS p, source AS author, liked IS NOT NULL AS liked_by_me
      ORDER BY p.created_at DESC
      LIMIT $limit
      `;
    console.log(`Limite de posts: ${limit}`);
    const result = (await this.neo4jService.runQuery(cypher, {
      userHandle,
      limit: neo4j.int(limit),
    })) as Array<{
      p: { properties: Post };
      author: { properties: User };
      liked_by_me: boolean;
    }>;

    return result.map((record) => {
      const postData = record.p.properties;
      const authorData = record.author?.properties;
      const createdAt = this.neo4jDateTimeToISO(postData.created_at);
      return {
        ...postData,
        created_at: createdAt,
        liked_by_me: record.liked_by_me ?? false,
        author: {
          username: authorData?.username,
          full_handle: authorData?.full_handle,
          avatar_url: authorData?.avatar_url,
          bio: authorData?.bio,
        },
      };
    });
  }

  async likePost(postId: string, userHandle: string): Promise<void> {
    const cypher = `
      MATCH (user:User {full_handle: $userHandle})
      MATCH (post:Post {id: $postId})
      MERGE (user)-[r:LIKES]->(post)
      ON CREATE SET r.created_at = datetime(), post.likes_count = post.likes_count + 1
      RETURN post AS p, user
      `;
    const result = (await this.neo4jService.runQuery(cypher, {
      postId,
      userHandle,
    })) as Array<{ p: { properties: Post }; user: { properties: User } }>;

  }
  async unlikePost(postId: string, userHandle: string): Promise<void> {
    const cypher = `
      MATCH (user:User {full_handle: $userHandle})-[r:LIKES]->(p:Post {id: $postId})
      DELETE r
      SET p.likes_count = p.likes_count - 1
      RETURN p, user
      `;
    const result = (await this.neo4jService.runQuery(cypher, {
      postId,
      userHandle,
    })) as Array<{ p: { properties: Post }; user: { properties: User } }>;

  }

  async getPostById(postId: string): Promise<Post | null> {
    const cypher = `
      MATCH (post:Post {id: $postId})
      RETURN post
      `;
    const result = (await this.neo4jService.runQuery(cypher, {
      postId,
    })) as Neo4jPostResult[];
    if (result.length === 0) return null;
    return result[0].post.properties;
  }

  async getPostWithLikes(postId: string): Promise<any> {
    const cypher = `
      MATCH (post:Post {id: $postId})
      OPTIONAL MATCH (liker:User)-[:LIKES]->(post)
      RETURN post, collect(liker) as likers
      `;
    const result = (await this.neo4jService.runQuery(cypher, {
      postId,
    })) as Neo4jPostWithLikesResult[];
    if (result.length === 0) return null;
    return {
      ...result[0].post.properties,
      likers: result[0].likers.map((liker) => liker.properties),
    };
  }

  async getPostsByUser(username: string, limit: number): Promise<Post[]> {
    const cypher = `
    MATCH (p:Post)<-[:AUTHORED]-(u:User {username: $username})
    RETURN p, u AS author
    ORDER BY p.created_at desc
    LIMIT $limit
    `;
    const result = (await this.neo4jService.runQuery(cypher, {
      username,
      limit: neo4j.int(limit),
    })) as Array<{ p: { properties: Post }; author: { properties: User } }>;

    return result.map((record) => {
      const postData = record.p.properties;
      const authorData = record.author?.properties;
      return {
        ...postData,
        created_at: this.neo4jDateTimeToISO(postData.created_at),
        author: {
          username: authorData?.username,
          full_handle: authorData?.full_handle,
          avatar_url: authorData?.avatar_url,
          bio: authorData?.bio,
        },
      };
    });
  }

  async updatePost(
    postId: string,
    content: string,
    authorHandle: string,
  ): Promise<Post> {
    const cypher = `
      MATCH (author:User {full_handle: $authorHandle})-[:AUTHORED]->(p:Post {id: $postId})
      SET p.content = $content, p.updated_at = datetime()
      RETURN p
      `;
    const result = (await this.neo4jService.runQuery(cypher, {
      postId,
      content,
      authorHandle,
    })) as Array<{ p: { properties: Post }; author: { properties: User } }>;

    if (!result || result.length === 0) {
      throw new Error('Post not found or unauthorized');
    }

    const post = result[0].p.properties;

    // Distribuir la actualización a seguidores remotos
    try {
      const updateActivity = {
        type: 'Update',
        actor: authorHandle,
        object: {
          type: 'Note',
          id: `${process.env.SERVER_URL}/posts/${postId}`,
          content: content,
          published: post.created_at,
          updated: new Date().toISOString(),
          attributedTo: authorHandle,
        },
      };

    } catch (error) {
      console.warn(`Advertencia: Error distribuyendo actualización:`, error);
    }

    return post;
  }

  private getServerUrl(serverName: string): string {
    const envKey =
      'PEER_' + serverName.toUpperCase().replace(/-/g, '_') + '_URL';
    return this.configService.get<string>(envKey) || `http://${serverName}`;
  }

  async deletePost(postId: string, authorHandle: string): Promise<boolean> {
    const cypher = `
      MATCH (author:User {full_handle: $authorHandle})-[:AUTHORED]->(p:Post {id: $postId})
      DETACH DELETE p
      RETURN true as deleted
      `;
    const result = await this.neo4jService.runQuery(cypher, {
      postId,
      authorHandle,
    });

    if (!result || result.length === 0) {
      throw new Error('Post not found or unauthorized');
    }

    // Distribuir la eliminación a seguidores remotos
    try {
      const deleteActivity = {
        type: 'Delete',
        actor: authorHandle,
        object: `${process.env.SERVER_URL}/posts/${postId}`,
      };

    } catch (error) {
      console.warn(`Advertencia: Error distribuyendo eliminación:`, error);
    }

    return true;
  }
}
