import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppService } from './app.service';
import { Neo4jService } from './neo4j/neo4j.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly neo4j: Neo4jService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('server-info')
  getServerInfo() {
    return {
      serverName: this.configService.get<string>('SERVER_NAME') || 'unknown',
      serverUrl: this.configService.get<string>('SERVER_URL') || '',
    };
  }

  @Get('health')
  async getHealth() {
    try {
      const result = await this.neo4j.runQuery('RETURN 1 as result');
      return {
        status: 'ok',
        message: 'Pixie API is running',
        neo4j: 'Connected',
        timestamp: new Date().toISOString(),
        result: (result[0] as { result: number })?.result,
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Neo4j connection failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }
}
