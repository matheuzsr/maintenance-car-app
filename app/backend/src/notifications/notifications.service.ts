import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ListNotificationsQueryDto } from './dto';

const publicNotificationSelect = {
  id: true,
  vehicleId: true,
  planId: true,
  trigger: true,
  severity: true,
  title: true,
  body: true,
  reason: true,
  dueDate: true,
  dueOdometerKm: true,
  status: true,
  sentAt: true,
  readAt: true,
  createdAt: true,
} satisfies Prisma.MaintenanceNotificationSelect;

type PublicNotification = Prisma.MaintenanceNotificationGetPayload<{
  select: typeof publicNotificationSelect;
}>;

export interface PaginatedNotifications {
  data: PublicNotification[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  getVapidPublicKey(): { publicKey: string } {
    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY');
    if (!publicKey) {
      throw new ServiceUnavailableException(
        'Web Push notifications are not configured',
      );
    }
    return { publicKey };
  }

  async findAll(
    userId: string,
    query: ListNotificationsQueryDto,
  ): Promise<PaginatedNotifications> {
    const where: Prisma.MaintenanceNotificationWhereInput = {
      userId,
      ...(query.unreadOnly ? { readAt: null } : {}),
    };
    const skip = (query.page - 1) * query.limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.maintenanceNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
        select: publicNotificationSelect,
      }),
      this.prisma.maintenanceNotification.count({ where }),
    ]);

    return {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async markAsRead(
    userId: string,
    notificationId: string,
  ): Promise<PublicNotification> {
    const notification = await this.prisma.maintenanceNotification.findFirst({
      where: { id: notificationId, userId },
      select: { id: true, readAt: true },
    });
    if (!notification) throw new NotFoundException('Notification not found');
    if (notification.readAt) {
      const current = await this.prisma.maintenanceNotification.findUnique({
        where: { id: notificationId },
        select: publicNotificationSelect,
      });
      if (!current) throw new NotFoundException('Notification not found');
      return current;
    }

    return this.prisma.maintenanceNotification.update({
      where: { id: notificationId, userId },
      data: { readAt: new Date() },
      select: publicNotificationSelect,
    });
  }
}
