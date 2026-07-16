import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RecommendationsService } from './recommendations.service';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { User } from '@/user/entities/user.entity';

@ApiTags('Recommendations')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('recommendations')
export class RecommendationsController {
  constructor(
    private readonly recommendationsService: RecommendationsService,
  ) {}

  @Get('follows')
  @ApiOperation({
    summary: 'Get suggested users to follow',
    description:
      'Returns a list of users recommended to follow based on your network. Uses 2-hop graph traversal weighted by mutual connections.',
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    description: 'Maximum results (default: 10)',
  })
  async getSuggestedFollows(
    @Request() req: { user: User },
    @Query('limit') limit?: string,
  ) {
    const userId = req.user.id;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return await this.recommendationsService.getSuggestedFollows(
      userId,
      limitNum,
    );
  }

  @Get('posts')
  @ApiOperation({
    summary: 'Get suggested posts',
    description:
      'Returns a list of posts recommended based on your follows and network trends. Considers direct posts from followed users and trending posts in your extended network.',
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    description: 'Maximum results (default: 20)',
  })
  async getSuggestedPosts(
    @Request() req: { user: User },
    @Query('limit') limit?: string,
  ) {
    const userId = req.user.id;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return await this.recommendationsService.getSuggestedPosts(
      userId,
      limitNum,
    );
  }

  @Get('users')
  @ApiOperation({
    summary: 'Find users similar to you',
    description:
      'Returns users with similar follow patterns to yours. Based on users you both follow (shared interests).',
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    description: 'Maximum results (default: 10)',
  })
  async getSimilarUsers(
    @Request() req: { user: User },
    @Query('limit') limit?: string,
  ) {
    const userId = req.user.id;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return await this.recommendationsService.getSimilarUsers(userId, limitNum);
  }

  @Get('metrics')
  @ApiOperation({
    summary: 'Get all recommendations with metrics',
    description:
      'Returns a complete set of recommendations (users, posts) along with performance metrics and dataset statistics.',
  })
  async getCompleteRecommendations(@Request() req: { user: User }) {
    const userId = req.user.id;
    return await this.recommendationsService.getCompleteRecommendations(userId);
  }

  @Get('dataset-size')
  @ApiOperation({
    summary: 'Get dataset statistics',
    description:
      'Returns the total count of users, posts, and relationships in the database. Useful for understanding recommendation coverage.',
  })
  async getDatasetSize() {
    return await this.recommendationsService.getDatasetSize();
  }
}
