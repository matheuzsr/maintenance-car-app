import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreatePushSubscriptionDto, PushSubscriptionResponseDto } from './dto';
import { PushSubscriptionsService } from './push-subscriptions.service';

@ApiTags('push-subscriptions')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'push-subscriptions', version: '1' })
export class PushSubscriptionsController {
  constructor(private readonly subscriptions: PushSubscriptionsService) {}

  @Post()
  @ApiOperation({
    summary: 'Registers or refreshes a browser push subscription',
  })
  @ApiCreatedResponse({ type: PushSubscriptionResponseDto })
  @ApiBadRequestResponse({ description: 'Push service host is not allowed' })
  @ApiConflictResponse({
    description: 'The endpoint is already registered by another user',
  })
  register(
    @CurrentUserId() userId: string,
    @Body() dto: CreatePushSubscriptionDto,
  ) {
    return this.subscriptions.register(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: "Lists the current user's push subscriptions" })
  @ApiOkResponse({ type: [PushSubscriptionResponseDto] })
  findAll(@CurrentUserId() userId: string) {
    return this.subscriptions.findAll(userId);
  }

  @Delete(':subscriptionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disables a push subscription' })
  @ApiNoContentResponse({ description: 'Push subscription disabled' })
  @ApiNotFoundResponse({ description: 'Push subscription not found' })
  disable(
    @CurrentUserId() userId: string,
    @Param('subscriptionId', ParseUUIDPipe) subscriptionId: string,
  ) {
    return this.subscriptions.disable(userId, subscriptionId);
  }
}
