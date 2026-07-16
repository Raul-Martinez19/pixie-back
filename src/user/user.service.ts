import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { Neo4jService } from 'src/neo4j/neo4j.service';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
interface Neo4jNode<T> {
  properties: T;
  labels: string[];
  identity: any;
}

interface RemoteUserSearchResult {
  id?: string | number;
  username: string;
  email?: string;
  password?: string;
  server?: string;
  full_handle?: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  is_remote?: boolean;
  remote_url?: string;
  public_key?: string;
  inbox_url?: string;
}

interface FederatedSearchTarget {
  serverName: string;
  baseUrl: string;
}

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  constructor(
    private readonly neo4jService: Neo4jService,
    private readonly configService: ConfigService,
  ) {}

  async createUser(userData: CreateUserDto): Promise<User> {
    const serverName = this.configService.get<string>('SERVER_NAME');

    // Verificar si el usuario ya existe
    const existingUserByUsername = await this.findLocalByUsername(
      userData.username,
    );
    if (existingUserByUsername) {
      throw new BadRequestException(
        `El usuario ${userData.username} ya existe`,
      );
    }

    console.log(`verificando ${userData.email}`);
    const existingUserByEmail = await this.findLocalByEmail(userData.email);
    if (existingUserByEmail) {
      throw new BadRequestException(
        `El usuario con correo ${userData.email} ya existe`,
      );
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const cypher = `
      CREATE (u:User {
      id: $id,
      username: $username,
      email: $email,
      password: $password,
      server: $server,
      full_handle: $full_handle,
      display_name: $display_name,
      bio: $bio,
      is_remote: $is_remote,
      created_at: datetime(),
      updated_at: datetime()
      })
      RETURN u
      `;
    const result = await this.neo4jService.runQuery(cypher, {
      id: randomUUID(),
      server: serverName,
      full_handle: `${userData.username}@${serverName}`,
      display_name: userData.username,
      bio: '',
      is_remote: false,
      username: userData.username,
      email: userData.email,
      password: hashedPassword,
    });
    const node = result[0]?.u as Neo4jNode<User> | undefined;
    return node?.properties as User;
  }

  async findAll(): Promise<User[]> {
    const query = 'MATCH (u:User) RETURN u';
    const result = (await this.neo4jService.runQuery(query)) as {
      u: Neo4jNode<User>;
    }[];

    return result.map((record) => record.u.properties);
  }

  async findAllOthers(id: number): Promise<User[]> {
    const query = 'MATCH (u:User) WHERE u.id <> $id RETURN u';
    const result = (await this.neo4jService.runQuery(query, { id })) as {
      u: Neo4jNode<User>;
    }[];

    return result.map((record) => record.u.properties);
  }

  async findOne(id: number): Promise<User> {
    const query = 'MATCH (u:User {id: $id}) RETURN u';
    const result = await this.neo4jService.runQuery(query, { id });

    if (!result || result.length === 0) {
      throw new Error(`El usuario con ID ${id} no existe.`);
    }

    const node = result[0].u as Neo4jNode<User>;
    return node.properties;
  }

  async findLocalByUsername(username: string): Promise<User | null> {
    const query = `
      MATCH (u:User {username: $username, is_remote: false})
      RETURN u
    `;
    const result = await this.neo4jService.runQuery(query, { username });

    if (!result || result.length === 0) {
      return null;
    }

    const node = result[0].u as Neo4jNode<User>;
    return node.properties;
  }

  async findLocalByEmail(email: string): Promise<User | null> {
    const query = `
      MATCH (u:User {email: $email, is_remote: false})
      RETURN u
    `;
    const result = await this.neo4jService.runQuery(query, { email });

    if (!result || result.length === 0) {
      return null;
    }

    const node = result[0].u as Neo4jNode<User>;
    return node.properties;
  }

  async findByFullHandle(full_handle: string): Promise<User | null> {
    const cypher = `
      MATCH (u:User {full_handle: $full_handle})
      RETURN u
      `;
    const result = await this.neo4jService.runQuery(cypher, { full_handle });

    // Si no hay resultados, retornar null
    if (!result || result.length === 0) {
      return null;
    }

    const node = result[0].u as Neo4jNode<User>;
    return node?.properties || null;
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const query = `
      MATCH (u:User {id: $id})
      SET u += $updateUserDto
      RETURN u
    `;
    const result = await this.neo4jService.runQuery(query, {
      id,
      updateUserDto,
    });

    if (!result || result.length === 0) {
      throw new Error(`Usuario con ID ${id} no encontrado.`);
    }

    const node = result[0].u as Neo4jNode<User>;
    return node.properties;
  }

  async remove(id: number): Promise<string> {
    const query = `
      MATCH (u:User {id: $id})
      DELETE u
      RETURN u.id as deletedId
    `;
    const result = await this.neo4jService.runQuery(query, { id });

    if (!result || result.length === 0) {
      throw new Error(`Usuario con id ${id} no encontrado.`);
    }

    return `Usuario ${id} eliminado de la base de datos`;
  }

  // Buscar usuario por username (para login)
  async findByUsername(username: string): Promise<User | null> {
    this.logger.log(`Buscando usuario por username: ${username}`);

    const localUser = await this.findLocalByUsername(username);
    if (localUser) {
      this.logger.log(`Usuario local encontrado:`, localUser);
      return localUser;
    }

    const query = `
      MATCH (u:User {username: $username, is_remote: true})
      RETURN u
    `;
    const result = await this.neo4jService.runQuery(query, { username });

    this.logger.log(`Resultado de la búsqueda:`, result);

    // Si no hay resultados, retornar null
    if (!result || result.length === 0) {
      return null;
    }

    const node = result[0].u as Neo4jNode<User>;
    this.logger.log(`Usuario encontrado:`, node.properties);
    return node.properties;
  }

  // Validar credenciales de login
  async validateUser(username: string, password: string): Promise<User | null> {
    this.logger.log(`Validando credenciales para ${username}`);

    const user = await this.findLocalByUsername(username);

    if (!user) {
      this.logger.warn(`Usuario ${username} no encontrado`);
      return null;
    }

    // Comparar contraseñas usando bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      this.logger.warn(`Contraseña inválida para usuario ${username}`);
      return null;
    }

    this.logger.log(`Credenciales válidas para ${username}`);

    // No devolver la contraseña
    const { password: _password, ...userWithoutPassword } = user;
    void _password;
    return userWithoutPassword as User;
  }

  async createRemoteUser(
    full_handle: string,
    remoteData: Partial<User> = {},
  ): Promise<User> {
    const [username, serverFromHandle] = full_handle.split('@');
    const server = remoteData.server || serverFromHandle;
    const cypher = `
      MERGE (u:User {full_handle: $full_handle})
      ON CREATE SET
        u.id = $id,
        u.created_at = datetime()
      SET
        u.username = $username,
        u.server = $server,
        u.is_remote = true,
        u.email = COALESCE($email, u.email),
        u.display_name = COALESCE($display_name, u.display_name),
        u.bio = COALESCE($bio, u.bio),
        u.avatar_url = COALESCE($avatar_url, u.avatar_url),
        u.remote_url = COALESCE($remote_url, u.remote_url),
        u.updated_at = datetime()
      RETURN u
      `;
    const result = await this.neo4jService.runQuery(cypher, {
      id: randomUUID(),
      username,
      server,
      full_handle,
      email: remoteData.email ?? null,
      display_name: remoteData.display_name ?? null,
      bio: remoteData.bio ?? null,
      avatar_url: remoteData.avatar_url ?? null,
      remote_url: remoteData.remote_url ?? null,
    });

    if (!result || result.length === 0) {
      throw new Error(`Failed to create remote user: ${full_handle}`);
    }

    const node = result[0].u as Neo4jNode<User>;
    return node.properties;
  }

  private getPeerBaseUrl(serverName: string): string | null {
    const envKey =
      'PEER_' + serverName.toUpperCase().replace(/-/g, '_') + '_URL';
    const url = this.configService.get<string>(envKey);
    return url ?? null;
  }

  private getFederatedSearchTargets(): FederatedSearchTarget[] {
    const serverName = this.configService.get<string>('SERVER_NAME');

    const targetsByServer: Record<string, FederatedSearchTarget[]> = {
      'planeta-tierra': [
        {
          serverName: 'planeta-marte',
          baseUrl:
            this.getPeerBaseUrl('planeta-marte') || 'http://localhost:3001',
        },
      ],
      'planeta-marte': [
        {
          serverName: 'planeta-tierra',
          baseUrl:
            this.getPeerBaseUrl('planeta-tierra') || 'http://localhost:3000',
        },
      ],
    };

    return targetsByServer[serverName || ''] ?? [];
  }

  async getRemoteProfile(handle: string): Promise<{
    user: Record<string, unknown> | null;
    posts: Record<string, unknown>[];
    foll: { followers: number; following: number };
  }> {
    const atIndex = handle.lastIndexOf('@');
    if (atIndex === -1) {
      return { user: null, posts: [], foll: { followers: 0, following: 0 } };
    }

    const username = handle.substring(0, atIndex);
    const serverName = handle.substring(atIndex + 1);
    const baseUrl = this.getPeerBaseUrl(serverName);

    if (!baseUrl) {
      return { user: null, posts: [], foll: { followers: 0, following: 0 } };
    }

    try {
      const [userRes, postsRes, follRes] = await Promise.all([
        fetch(`${baseUrl}/user/profile/${encodeURIComponent(username)}`),
        fetch(`${baseUrl}/posts/user/${encodeURIComponent(username)}`),
        fetch(`${baseUrl}/user/foll/${encodeURIComponent(username)}`),
      ]);

      const user = userRes.ok
        ? ((await userRes.json()) as Record<string, unknown>)
        : null;
      const postsRaw: unknown = postsRes.ok ? await postsRes.json() : [];
      const foll = follRes.ok
        ? ((await follRes.json()) as { followers: number; following: number })
        : { followers: 0, following: 0 };

      return {
        user,
        posts: Array.isArray(postsRaw)
          ? (postsRaw as Record<string, unknown>[])
          : [],
        foll: foll ?? { followers: 0, following: 0 },
      };
    } catch (error) {
      this.logger.warn(
        `Error obteniendo perfil remoto de ${handle}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { user: null, posts: [], foll: { followers: 0, following: 0 } };
    }
  }

  private async searchFederatedUsers(
    query: string,
    excludeHandle?: string,
  ): Promise<User[]> {
    const federatedUsers: User[] = [];

    for (const target of this.getFederatedSearchTargets()) {
      try {
        const searchUrl = new URL('/user/search', target.baseUrl);
        searchUrl.searchParams.set('q', query);
        searchUrl.searchParams.set('federated', 'false');
        if (excludeHandle) {
          searchUrl.searchParams.set('excludeHandle', excludeHandle);
        }

        const response = await fetch(searchUrl.toString(), {
          headers: {
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          this.logger.warn(
            `No se pudo consultar ${target.serverName} para búsqueda federada: HTTP ${response.status}`,
          );
          continue;
        }

        const remoteUsers = (await response.json()) as RemoteUserSearchResult[];

        for (const remoteUser of remoteUsers) {
          if (!remoteUser?.username) {
            continue;
          }

          const fullHandle =
            remoteUser.full_handle ||
            `${remoteUser.username}@${remoteUser.server || target.serverName}`;

          federatedUsers.push({
            id: remoteUser.id ? String(remoteUser.id) : randomUUID(),
            username: remoteUser.username,
            email: remoteUser.email || '',
            password: '',
            server: remoteUser.server || target.serverName,
            full_handle: fullHandle,
            display_name: remoteUser.display_name || remoteUser.username,
            bio: remoteUser.bio || '',
            avatar_url: remoteUser.avatar_url || '',
            is_remote: true,
            remote_url: remoteUser.remote_url,
            public_key: remoteUser.public_key,
            inbox_url: remoteUser.inbox_url,
          } as User);
        }
      } catch (error) {
        this.logger.warn(
          `No se pudo consultar ${target.serverName} para búsqueda federada: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return federatedUsers;
  }

  async getFoll(
    username: string,
  ): Promise<{ followers: number; following: number }> {
    const cypherFollowers = `
    MATCH (:User)-[f:FOLLOWS]->(u:User {username: $username})
    RETURN count(f) as count
    `;
    const cypherFollowing = `
    MATCH (u:User {username: $username})-[r:FOLLOWS]->(:User)
    RETURN count(r) as count
    `;

    const followersResult = (await this.neo4jService.runQuery(cypherFollowers, {
      username,
    })) as Array<{ count: number }>;
    const followingResult = (await this.neo4jService.runQuery(cypherFollowing, {
      username,
    })) as Array<{ count: number }>;

    this.logger.log(`Seguidores ${followersResult[0].count}`);
    this.logger.log(`Seguidos ${followingResult[0].count}`);

    // Convertir Neo4j Integer a número
    let followers = 0;
    let following = 0;

    if (followersResult?.[0]?.count) {
      const count = followersResult[0].count;
      followers =
        typeof count === 'object' &&
        (count as Record<string, unknown>).low !== undefined
          ? ((count as Record<string, unknown>).low as number)
          : count;
    }

    if (followingResult?.[0]?.count) {
      const count = followingResult[0].count;
      following =
        typeof count === 'object' &&
        (count as Record<string, unknown>).low !== undefined
          ? ((count as Record<string, unknown>).low as number)
          : count;
    }

    return { followers, following };
  }

  async searchUsers(
    query: string,
    includeFederated: boolean = false,
    excludeHandle?: string,
  ): Promise<User[]> {
    const cypher = `
      MATCH (u:User {is_remote: false})
      WHERE
        ($excludeHandle IS NULL OR u.full_handle <> $excludeHandle) AND
        (
          toLower(coalesce(u.username, '')) CONTAINS $query
        )
      RETURN u
      ORDER BY u.username
      LIMIT 20
    `;

    const result = (await this.neo4jService.runQuery(cypher, {
      query: query.toLowerCase(),
      excludeHandle: excludeHandle || null,
    })) as {
      u: Neo4jNode<User>;
    }[];

    const localUsers = result.map((record) => record.u.properties);

    if (!includeFederated) {
      return localUsers;
    }

    const federatedUsers = await this.searchFederatedUsers(
      query,
      excludeHandle,
    );
    const mergedUsers = new Map<string, User>();

    for (const user of localUsers) {
      mergedUsers.set(
        user.full_handle || `${user.username}@${user.server}`,
        user,
      );
    }

    for (const user of federatedUsers) {
      mergedUsers.set(
        user.full_handle || `${user.username}@${user.server}`,
        user,
      );
    }

    return Array.from(mergedUsers.values()).sort((left, right) => {
      const usernameComparison = left.username.localeCompare(right.username);
      if (usernameComparison !== 0) {
        return usernameComparison;
      }

      return (left.full_handle || '').localeCompare(right.full_handle || '');
    });
  }
}
