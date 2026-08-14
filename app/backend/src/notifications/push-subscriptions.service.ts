import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePushSubscriptionDto } from './dto';
import { isAllowedPushEndpoint } from './push-endpoint-policy';

const publicSubscriptionSelect = {
  id: true,
  endpoint: true,
  userAgent: true,
  disabledAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PushSubscriptionSelect;

type PublicPushSubscription = Prisma.PushSubscriptionGetPayload<{
  select: typeof publicSubscriptionSelect;
}>;

@Injectable()
export class PushSubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async register(
    userId: string,
    dto: CreatePushSubscriptionDto,
  ): Promise<PublicPushSubscription> {
    if (
      !isAllowedPushEndpoint(
        dto.endpoint,
        this.config.getOrThrow<string>('WEB_PUSH_ALLOWED_HOSTS'),
      )
    ) {
      throw new BadRequestException('Push service host is not allowed');
    }
    const existing = await this.prisma.pushSubscription.findUnique({
      where: { endpoint: dto.endpoint },
    });
    if (existing && existing.userId !== userId) {
      throw new ConflictException(
        'This push subscription belongs to another user',
      );
    }

    if (existing) {
      return this.prisma.pushSubscription.update({
        where: { id: existing.id, userId },
        data: {
          p256dh: dto.p256dh,
          auth: dto.auth,
          userAgent: dto.userAgent,
          disabledAt: null,
        },
        select: publicSubscriptionSelect,
      });
    }

    try {
      return await this.prisma.pushSubscription.create({
        data: { userId, ...dto },
        select: publicSubscriptionSelect,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('This push endpoint is already registered');
      }
      throw error;
    }
  }

  findAll(userId: string): Promise<PublicPushSubscription[]> {
    return this.prisma.pushSubscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: publicSubscriptionSelect,
    });
  }

  async disable(userId: string, subscriptionId: string): Promise<void> {
    const subscription = await this.prisma.pushSubscription.findFirst({
      where: { id: subscriptionId, userId, disabledAt: null },
      select: { id: true },
    });
    if (!subscription)
      throw new NotFoundException('Push subscription not found');

    await this.prisma.pushSubscription.update({
      where: { id: subscriptionId, userId },
      data: { disabledAt: new Date() },
    });
  }
}
