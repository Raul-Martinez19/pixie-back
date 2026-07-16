import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Neo4jService } from 'src/neo4j/neo4j.service';
import { User } from 'src/user/entities/user.entity';
import { UserService } from 'src/user/user.service';

@Injectable()
export class FollowsService {
  constructor(
    private readonly userService: UserService,
    private readonly neo4jService: Neo4jService,
  ) { }

  async followUser(followerHandle: string, followingHandle: string) {
    console.log(
      `👤 Procesando follow: ${followerHandle} -> ${followingHandle}`,
    );

    let followingUser =
      await this.userService.findByFullHandle(followingHandle);

    if (!followingUser && followingHandle.includes('@')) {
      console.log(`    Usuario remoto no existe localmente, creando...`);
      followingUser = await this.userService.createRemoteUser(followingHandle);
      console.log(`   Usuario remoto creado: ${followingHandle}`);
    }
    if (followingUser !== null)
      console.log(`usuario: ${followingUser.full_handle}`);

    if (!followingUser) {
      throw new Error(`User not found: ${followingHandle}`);
    }

    const query = `
        MATCH (follower:User {full_handle: $followerHandle})
        MATCH (following:User {full_handle: $followingHandle})
        MERGE (follower)-[r:FOLLOWS]->(following)
        ON CREATE SET
            r.id = $id,
            r.status = $status,
            r.is_remote = $is_remote,
            r.created_at = datetime()
        RETURN r
        `;

    const isRemote = followingUser.is_remote;
    const status = isRemote ? 'pending' : 'accepted';

    console.log(`   Detalles del follow:`);
    console.log(`      - Usuario remoto: ${isRemote}`);
    console.log(`      - Estado: ${status}`);

    const result = (await this.neo4jService.runQuery(query, {
      followerHandle,
      followingHandle,
      id: randomUUID(),
      status,
      is_remote: isRemote,
    })) as Array<{ r: { properties: Record<string, unknown> } }>;

    console.log(`   Relación de follow creada en Neo4j`);

    return result[0]?.r.properties;
  }

  async getFollowers(userHandle: string, limit: number): Promise<User[]> {
    const cypher = `
            MATCH (follower:User)-[r:FOLLOWS {status: 'accepted'}]->(user:User
            {full_handle: $userHandle})
            RETURN follower LIMIT $limit
            `;
    const result = (await this.neo4jService.runQuery(cypher, {
      userHandle,
      limit,
    })) as Array<{
      follower: { properties: User };
    }>;
    return result.map((record) => record.follower.properties);
  }

  async getFollowing(userHandle: string, limit: number): Promise<User[]> {
    const cypher = `
        MATCH (user:User {full_handle: $userHandle})-[r:FOLLOWS {status:
        'accepted'}]->(following:User)
        RETURN following LIMIT $limit
        `;
    const result = (await this.neo4jService.runQuery(cypher, {
      userHandle,
      limit,
    })) as Array<{
      following: { properties: User };
    }>;
    return result.map((record) => record.following.properties);
  }

  async isFollowing(
    followerHandle: string,
    followingHandle: string,
  ): Promise<boolean> {
    const cypher = `
        MATCH (follower:User {full_handle: $followerHandle})-[r:FOLLOWS
        {status: 'accepted'}]->(following:User {full_handle: $followingHandle})
        RETURN r
        `;
    const result = (await this.neo4jService.runQuery(cypher, {
      followerHandle,
      followingHandle,
    })) as Array<{ r: unknown }>;
    return result.length > 0;
  }

  async acceptFollow(
    followerHandle: string,
    followingHandle: string,
  ): Promise<void> {
    const cypher = `
        MATCH (follower:User {full_handle: $followerHandle})-[r:FOLLOWS]->
        (following:User {full_handle: $followingHandle})
        SET r.status = 'accepted', r.updated_at = datetime()
        RETURN r
        `;
    await this.neo4jService.runQuery(cypher, {
      followerHandle,
      followingHandle,
    });
  }

  async getMutualFollows(
    userHandle1: string,
    userHandle2: string,
  ): Promise<User[]> {
    const cypher = `
        MATCH (user1:User {full_handle: $userHandle1})-[:FOLLOWS]->
        (mutual:User)<-[:FOLLOWS]-(user2:User {full_handle: $userHandle2})
        RETURN mutual
        `;
    const result = (await this.neo4jService.runQuery(cypher, {
      userHandle1,
      userHandle2,
    })) as Array<{ mutual: { properties: User } }>;
    return result.map((record) => record.mutual.properties);
  }

  async getSuggestedFollows(
    userHandle: string,
    limit: number = 5,
  ): Promise<User[]> {
    const cypher = `
        MATCH (user:User {full_handle: $userHandle})-[:FOLLOWS]->
        (followed:User)-[:FOLLOWS]->(suggested:User)
        WHERE NOT (user)-[:FOLLOWS]->(suggested) AND suggested.full_handle <>
        $userHandle
        RETURN suggested, count(*) as connections
        ORDER BY connections DESC
        LIMIT $limit
        `;
    const result = (await this.neo4jService.runQuery(cypher, {
      userHandle,
      limit,
    })) as Array<{ suggested: { properties: User } }>;
    return result.map((record) => record.suggested.properties);
  }

  async unfollowUser(
    followerHandle: string,
    followingHandle: string,
  ): Promise<{ message: string }> {
    const cypher = `
      MATCH (follower:User {full_handle: $followerHandle})-[r:FOLLOWS]->(following:User {full_handle: $followingHandle})
      DELETE r
      RETURN follower, following
    `;

    const result = await this.neo4jService.runQuery(cypher, {
      followerHandle,
      followingHandle,
    });

    if (result.length === 0) {
      throw new Error(
        `No follow relationship found between ${followerHandle} and ${followingHandle}`,
      );
    }

    return { message: 'Unfollow completado' };
  }

  async isFollowingByUsername(
    followerUsername: string,
    followingUsername: string,
  ): Promise<boolean> {
    const cypher = `
      MATCH (follower:User {username: $followerUsername})-[r:FOLLOWS]->(following:User {username: $followingUsername})
      RETURN r
    `;

    const result = (await this.neo4jService.runQuery(cypher, {
      followerUsername,
      followingUsername,
    })) as Array<{ r: unknown }>;

    return result.length > 0;
  }

  async followUserByUsername(
    followerUsername: string,
    followingUsername: string,
  ): Promise<{ message: string }> {
    // Obtener usuarios por username
    const follower = await this.userService.findByUsername(followerUsername);
    const following = await this.userService.findByUsername(followingUsername);

    if (!follower) {
      throw new Error(`Follower user not found: ${followerUsername}`);
    }

    if (!following) {
      throw new Error(`Following user not found: ${followingUsername}`);
    }

    const cypher = `
      MATCH (follower:User {username: $followerUsername})
      MATCH (following:User {username: $followingUsername})
      CREATE (follower)-[r:FOLLOWS {
        id: $id,
        status: 'accepted',
        created_at: datetime()
      }]->(following)
      RETURN r
    `;

    const result = await this.neo4jService.runQuery(cypher, {
      followerUsername,
      followingUsername,
      id: randomUUID(),
    });

    if (result.length === 0) {
      throw new Error('Failed to create follow relationship');
    }

    return { message: 'Follow completado' };
  }
}
