import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ListNotificationsQueryDto,
  MaintenanceNotificationResponseDto,
  PaginatedNotificationsResponseDto,
  VapidPublicKeyResponseDto,
} from './dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'notifications', version: '1' })
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('vapid-public-key')
  @ApiOperation({ summary: 'Returns the public key required by the Push API' })
  @ApiOkResponse({ type: VapidPublicKeyResponseDto })
  @ApiServiceUnavailableResponse({
    description: 'Web Push notifications are not configured',
  })
  getVapidPublicKey() {
    return this.notifications.getVapidPublicKey();
  }

  @Get()
  @ApiOperation({ summary: "Lists the current user's maintenance alerts" })
  @ApiOkResponse({ type: PaginatedNotificationsResponseDto })
  findAll(
    @CurrentUserId() userId: string,
    @Query() query: ListNotificationsQueryDto,
  ) {
    return this.notifications.findAll(userId, query);
  }

  @Patch(':notificationId/read')
  @ApiOperation({ summary: 'Marks a maintenance alert as read' })
  @ApiOkResponse({ type: MaintenanceNotificationResponseDto })
  @ApiNotFoundResponse({ description: 'Notification not found' })
  markAsRead(
    @CurrentUserId() userId: string,
    @Param('notificationId', ParseUUIDPipe) notificationId: string,
  ) {
    return this.notifications.markAsRead(userId, notificationId);
  }
}
