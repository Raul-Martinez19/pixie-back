import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PostsModule } from './posts/posts.module';
import { FollowsModule } from './follows/follows.module';
import { UserModule } from './user/user.module';
import { Neo4jModule } from './neo4j/neo4j.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { NotificationsModule } from './notifications/notifications.module';

const getEnvFilePath = (): string => {
  const envFile = process.env.ENV_FILE || '.env';
  console.log(` Cargando archivo de configuración: ${envFile}`);
  console.log(` Variables de entorno disponibles:`, {
    ENV_FILE: process.env.ENV_FILE,
    NODE_ENV: process.env.NODE_ENV,
  });
  return envFile;
};

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: getEnvFilePath(),
    }),
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 3,
    }),
    Neo4jModule,
    AuthModule,
    UserModule,
    PostsModule,
    FollowsModule,
    RecommendationsModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
