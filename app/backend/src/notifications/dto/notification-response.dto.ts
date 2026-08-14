import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  NotificationDispatchStatus,
  NotificationSeverity,
  NotificationTrigger,
} from '@prisma/client';

export class PushSubscriptionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  endpoint!: string;

  @ApiPropertyOptional({ nullable: true })
  userAgent!: string | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  disabledAt!: Date | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}

export class MaintenanceNotificationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  vehicleId!: string;

  @ApiProperty({ format: 'uuid' })
  planId!: string;

  @ApiProperty({ enum: NotificationTrigger })
  trigger!: NotificationTrigger;

  @ApiProperty({ enum: NotificationSeverity })
  severity!: NotificationSeverity;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  body!: string;

  @ApiProperty()
  reason!: string;

  @ApiPropertyOptional({ format: 'date', nullable: true })
  dueDate!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  dueOdometerKm!: number | null;

  @ApiProperty({ enum: NotificationDispatchStatus })
  status!: NotificationDispatchStatus;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  sentAt!: Date | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  readAt!: Date | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;
}

export class NotificationPaginationMetaDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class PaginatedNotificationsResponseDto {
  @ApiProperty({ type: [MaintenanceNotificationResponseDto] })
  data!: MaintenanceNotificationResponseDto[];

  @ApiProperty({ type: NotificationPaginationMetaDto })
  meta!: NotificationPaginationMetaDto;
}

export class VapidPublicKeyResponseDto {
  @ApiProperty({ description: 'URL-safe Base64 VAPID public key.' })
  publicKey!: string;
}
