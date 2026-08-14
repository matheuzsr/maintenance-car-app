import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { PushSubscriptionsService } from './push-subscriptions.service';

describe('PushSubscriptionsService', () => {
  const userId = 'user-1';
  const dto = {
    endpoint: 'https://push.example.test/subscription',
    p256dh: Buffer.alloc(65).toString('base64url'),
    auth: Buffer.alloc(16).toString('base64url'),
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

  it('recovers an owned endpoint created concurrently', async () => {
    pushSubscription.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'subscription-1', userId });
    pushSubscription.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: '6.19.3',
      }),
    );
    pushSubscription.update.mockResolvedValue({ id: 'subscription-1' });

    await expect(service.register(userId, dto)).resolves.toEqual({
      id: 'subscription-1',
    });
    expect(pushSubscription.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'subscription-1', userId } }),
    );
  });

  it('only disables an active subscription owned by the user', async () => {
    pushSubscription.findFirst.mockResolvedValue(null);

    await expect(service.disable(userId, 'subscription-1')).rejects.toThrow(
      NotFoundException,
    );
    expect(pushSubscription.update).not.toHaveBeenCalled();
  });
});
