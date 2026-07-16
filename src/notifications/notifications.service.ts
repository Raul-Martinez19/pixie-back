import { Injectable, Logger } from '@nestjs/common';
import neo4j from 'neo4j-driver';
import { Neo4jService } from 'src/neo4j/neo4j.service';

export interface Notification {
  id: string;
  type: 'follow' | 'like';
  actor_username: string;
  actor_full_handle: string;
  post_id?: string;
  post_content?: string;
  created_at: string;
  read: boolean;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly neo4jService: Neo4jService) {}

  async getNotifications(userId: string, limit = 30): Promise<Notification[]> {
    const followQuery = `
      MATCH (me:User {id: $userId})
      MATCH (actor:User)-[f:FOLLOWS {status: 'accepted'}]->(me)
      WHERE actor.id <> $userId
      RETURN
        actor.id + '-follow' AS id,
        'follow' AS type,
        actor.username AS actor_username,
        actor.full_handle AS actor_full_handle,
        null AS post_id,
        null AS post_content,
        f.created_at AS created_at,
        CASE
          WHEN me.notifications_seen_at IS NOT NULL
               AND f.created_at <= me.notifications_seen_at
          THEN true ELSE false
        END AS read
      ORDER BY f.created_at DESC
      LIMIT $limit
    `;

    const likeQuery = `
      MATCH (me:User {id: $userId})
      MATCH (actor:User)-[l:LIKES]->(post:Post)<-[:AUTHORED]-(me)
      WHERE actor.id <> $userId
      RETURN
        actor.id + '-like-' + post.id AS id,
        'like' AS type,
        actor.username AS actor_username,
        actor.full_handle AS actor_full_handle,
        post.id AS post_id,
        left(post.content, 80) AS post_content,
        l.created_at AS created_at,
        CASE
          WHEN me.notifications_seen_at IS NOT NULL
               AND l.created_at <= me.notifications_seen_at
          THEN true ELSE false
        END AS read
      ORDER BY l.created_at DESC
      LIMIT $limit
    `;

    try {
      const [followResults, likeResults] = await Promise.all([
        this.neo4jService.runQuery(followQuery, {
          userId,
          limit: neo4j.int(limit),
        }),
        this.neo4jService.runQuery(likeQuery, {
          userId,
          limit: neo4j.int(limit),
        }),
      ]);

      const notifications: Notification[] = [
        ...followResults.map((r) => this.mapRecord(r, 'follow')),
        ...likeResults.map((r) => this.mapRecord(r, 'like')),
      ]
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )
        .slice(0, limit);

      return notifications;
    } catch (error) {
      this.logger.error(
        `Error fetching notifications for user ${userId}`,
        error,
      );
      throw error;
    }
  }

  async markAsSeen(userId: string): Promise<void> {
    const cypher = `
      MATCH (me:User {id: $userId})
      SET me.notifications_seen_at = datetime()
    `;
    await this.neo4jService.runQuery(cypher, { userId });
  }

  private mapRecord(
    r: Record<string, unknown>,
    type: 'follow' | 'like',
  ): Notification {
    return {
      id: r.id as string,
      type,
      actor_username: r.actor_username as string,
      actor_full_handle: r.actor_full_handle as string,
      post_id: r.post_id as string | undefined,
      post_content: r.post_content as string | undefined,
      created_at: this.neo4jDateTimeToISO(r.created_at),
      read: r.read as boolean,
    };
  }

  private neo4jDateTimeToISO(dt: unknown): string {
    if (!dt) return new Date().toISOString();
    if (typeof dt === 'string') return dt;
    const d = dt as Record<string, unknown>;
    if (typeof d.year === 'number') {
      const p = (n: number) => String(n).padStart(2, '0');
      const ms = String(
        Math.floor(((d.nanosecond as number) ?? 0) / 1_000_000),
      ).padStart(3, '0');
      return `${d.year}-${p(d.month as number)}-${p(d.day as number)}T${p(d.hour as number)}:${p(d.minute as number)}:${p(d.second as number)}.${ms}Z`;
    }
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
}
