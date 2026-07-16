import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import neo4j, { Driver, Session } from 'neo4j-driver';

@Injectable()
export class Neo4jService implements OnModuleInit, OnModuleDestroy {
  private driver!: Driver;
  private readonly logger = new Logger(Neo4jService.name);

  constructor(private readonly configService: ConfigService) {}

  // Se ejecuta cuando el módulo se inicializa
  async onModuleInit() {
    const uri =
      this.configService.get<string>('NEO4J_URI') || 'bolt://localhost:7687';
    const username =
      this.configService.get<string>('NEO4J_USERNAME') || 'neo4j';
    const password =
      this.configService.get<string>('NEO4J_PASSWORD') ||
      process.env.NEO4J_PASSWORD || // Fallback directo a process.env
      'password';

    this.logger.log(` Conectando a Neo4j en: ${uri} (Usuario: ${username})`);
    if (password === 'password')
      this.logger.warn(' Usando contraseña por defecto "password"');

    this.driver = neo4j.driver(uri, neo4j.auth.basic(username, password), {
      disableLosslessIntegers: true,
    });

    // Verifica la conexión
    try {
      await this.driver.verifyConnectivity();
      this.logger.log('Conectado a Neo4j exitosamente');
    } catch (error) {
      this.logger.error(' Error conectando a Neo4j', error);
      throw error;
    }
  }

  // Se ejecuta cuando el módulo se destruye
  async onModuleDestroy() {
    await this.driver.close();
    this.logger.log('Desconectado de Neo4j');
  }

  // Obtener una sesión para ejecutar queries
  getSession(): Session {
    return this.driver.session();
  }

  // Método helper para ejecutar queries fácilmente
  async runQuery(query: string, params = {}) {
    const session = this.getSession();
    try {
      const result = await session.run(query, params);
      return result.records.map((record) => record.toObject());
    } finally {
      await session.close();
    }
  }
}
