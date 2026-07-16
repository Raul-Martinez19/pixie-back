import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Logger,
  Get,
  Param,
  Delete,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FollowsService } from './follows.service';

@Controller('follows')
export class FollowsController {
  private readonly logger = new Logger(FollowsController.name);

  constructor(private readonly followsService: FollowsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async create(
    @Body() body: { following: string },
    @Request()
    req: { user: { full_handle: string; id: string; username: string } },
  ) {
    this.logger.log(` POST /follows`);
    this.logger.log(`   Seguidor: ${req.user.full_handle}`);
    this.logger.log(`   Siguiendo: ${body.following}`);

    try {
      const result = await this.followsService.followUser(
        req.user.full_handle,
        body.following,
      );
      this.logger.log(`   Follow completado exitosamente`);
      return { status: 'ok', data: result };
    } catch (error) {
      this.logger.error(`    Error en follow:`, error);
      throw error;
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':targetHandle')
  async unfollow(
    @Param('targetHandle') targetHandle: string,
    @Request()
    req: { user: { full_handle: string; id: string; username: string } },
  ) {
    this.logger.log(` DELETE /follows/:targetHandle`);
    this.logger.log(`   Seguidor: ${req.user.full_handle}`);
    this.logger.log(`   Dejar de seguir: ${targetHandle}`);

    try {
      const result = await this.followsService.unfollowUser(
        req.user.full_handle,
        targetHandle,
      );
      this.logger.log(`   Unfollow completado`);
      return { status: 'ok', data: result };
    } catch (error) {
      this.logger.error(`    Error en unfollow:`, error);
      throw error;
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('status/:targetHandle')
  async checkFollowStatus(
    @Param('targetHandle') targetHandle: string,
    @Request()
    req: { user: { full_handle: string; id: string; username: string } },
  ) {
    this.logger.log(`GET /follows/status/:targetHandle`);
    this.logger.log(`   Usuario: ${req.user.full_handle}`);
    this.logger.log(`   Verificando: ${targetHandle}`);

    try {
      const isFollowing = await this.followsService.isFollowing(
        req.user.full_handle,
        targetHandle,
      );
      this.logger.log(`   Siguiendo: ${isFollowing}`);
      return { status: 'ok', isFollowing };
    } catch (error) {
      this.logger.error(`    Error checking follow status:`, error);
      return { isFollowing: false };
    }
  }
}
