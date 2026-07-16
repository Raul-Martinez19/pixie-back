import { Module } from '@nestjs/common';
import { FollowsService } from './follows.service';
import { FollowsController } from './follows.controller';
import { UserModule } from '../user/user.module';
import { Neo4jModule } from '../neo4j/neo4j.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [UserModule, Neo4jModule, AuthModule],
  providers: [FollowsService],
  controllers: [FollowsController],
})
export class FollowsModule {}
