import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { PushSubscriptionsService } from './push-subscriptions.service';

describe('PushSubscriptionsService', () => {
  const userId = 'user-1';
  const dto = {
    endpoint: 'https://push.example.test/subscription',
    p256dh: 'public-key',
    auth: 'auth-secret',
    userAgent: 'Test browser',
  };
  const pushSubscription = {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
  const prisma = { pushSubscription };
  const service = new PushSubscriptionsService(
    prisma as unknown as PrismaService,
    {
      getOrThrow: jest.fn().mockReturnValue('push.example.test'),
    } as unknown as ConfigService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('creates a new subscription for the authenticated user', async () => {
    pushSubscription.findUnique.mockResolvedValue(null);
    pushSubscription.create.mockResolvedValue({ id: 'subscription-1' });

    await service.register(userId, dto);

    expect(pushSubscription.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { userId, ...dto } }),
    );
  });

  it('refreshes keys and re-enables an existing owned endpoint', async () => {
    pushSubscription.findUnique.mockResolvedValue({
      id: 'subscription-1',
      userId,
    });
    pushSubscription.update.mockResolvedValue({ id: 'subscription-1' });

    await service.register(userId, dto);

    expect(pushSubscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'subscription-1', userId },
        data: {
          p256dh: dto.p256dh,
          auth: dto.auth,
          userAgent: dto.userAgent,
          disabledAt: null,
        },
      }),
    );
  });

  it('does not allow an endpoint to move between users', async () => {
    pushSubscription.findUnique.mockResolvedValue({
      id: 'subscription-1',
      userId: 'another-user',
    });

    await expect(service.register(userId, dto)).rejects.toThrow(
      ConflictException,
    );
    expect(pushSubscription.update).not.toHaveBeenCalled();
  });

  it('only disables an active subscription owned by the user', async () => {
    pushSubscription.findFirst.mockResolvedValue(null);

    await expect(service.disable(userId, 'subscription-1')).rejects.toThrow(
      NotFoundException,
    );
    expect(pushSubscription.update).not.toHaveBeenCalled();
  });
});
