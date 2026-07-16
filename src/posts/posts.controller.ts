import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { User } from '../user/entities/user.entity';

@Controller('posts')
export class PostsController {
  private readonly logger = new Logger(PostsController.name);

  constructor(private readonly postsService: PostsService) {}

  /**
   * Crear un nuevo post
   * Requiere autenticación JWT
   */
  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(
    @Body() createPostDto: CreatePostDto,
    @Request() req: { user: User },
  ) {
    this.logger.log(` POST /posts`);
    this.logger.log(`   Autor: ${req.user.full_handle}`);
    this.logger.log(
      `   Contenido: ${createPostDto.content.substring(0, 50)}...`,
    );

    const post = await this.postsService.createPost(createPostDto, req.user);

    this.logger.log(`   Post creado exitosamente: ${post.id}`);
    return post;
  }

  /**
   * Obtener el feed de un usuario autenticado
   * Retorna posts de usuarios seguidos + posts propios
   */
  @Get('feed')
  @UseGuards(AuthGuard('jwt'))
  async getFeed(@Request() req: { user: User }) {
    this.logger.log(`📰 GET /posts/feed`);
    this.logger.log(`   Usuario: ${req.user.full_handle}`);

    const feed = await this.postsService.getFeed(req.user.full_handle);

    this.logger.log(`   Feed obtenido: ${feed.length} posts`);
    return feed;
  }

  /**
   * Obtener un post específico
   */
  @Get(':id')
  async getPost(@Param('id') id: string) {
    const post = await this.postsService.getPostById(id);
    if (!post) {
      return { error: 'Post not found' };
    }
    return post;
  }

  /**
   * Dar like a un post
   */
  @Post(':id/like')
  @UseGuards(AuthGuard('jwt'))
  async likePost(@Param('id') id: string, @Request() req: { user: User }) {
    await this.postsService.likePost(id, req.user.full_handle);
    return { message: 'Like added' };
  }

  /**
   * Quitar like a un post
   */
  @Post(':id/unlike')
  @UseGuards(AuthGuard('jwt'))
  async unlikePost(@Param('id') id: string, @Request() req: { user: User }) {
    await this.postsService.unlikePost(id, req.user.full_handle);
    return { message: 'Like removed' };
  }

  @Get('user/:username')
  async getUserPosts(
    @Param('username') username: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return await this.postsService.getPostsByUser(username, limitNum);
  }

  @Post(':id/update')
  @UseGuards(AuthGuard('jwt'))
  async updatePost(
    @Param('id') id: string,
    @Body() updatePostDto: UpdatePostDto,
    @Request() req: { user: User },
  ) {
    this.logger.log(`Updating post ${id} by ${req.user.full_handle}`);
    const post = await this.postsService.updatePost(
      id,
      updatePostDto.content,
      req.user.full_handle,
    );
    return { statusCode: 200, message: 'Post updated', data: post };
  }

  @Post(':id/delete')
  @UseGuards(AuthGuard('jwt'))
  async deletePost(@Param('id') id: string, @Request() req: { user: User }) {
    this.logger.log(`Deleting post ${id} by ${req.user.full_handle}`);
    await this.postsService.deletePost(id, req.user.full_handle);
    return { statusCode: 200, message: 'Post deleted' };
  }
}
