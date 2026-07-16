import {
  Controller,
  Get,
  Patch,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { User } from '@/user/entities/user.entity';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get notifications for the authenticated user' })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    description: 'Max results (default: 30)',
  })
  async getNotifications(
    @Request() req: { user: User },
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 30;
    return this.notificationsService.getNotifications(req.user.id, limitNum);
  }

  @Patch('seen')
  @ApiOperation({ summary: 'Mark all notifications as seen' })
  async markAsSeen(@Request() req: { user: User }) {
    await this.notificationsService.markAsSeen(req.user.id);
    return { message: 'Notifications marked as seen' };
  }
}
