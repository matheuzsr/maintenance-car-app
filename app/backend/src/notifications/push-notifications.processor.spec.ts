import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import {
  SEND_PUSH_NOTIFICATION_JOB,
  SendPushNotificationJobData,
} from './notifications.constants';
import { PushNotificationsProcessor } from './push-notifications.processor';
import { WebPushGateway } from './web-push.gateway';

describe('PushNotificationsProcessor', () => {
  const notificationDelegate = {
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  };
  const deliveryDelegate = {
    upsert: jest.fn(),
    updateMany: jest.fn(),
    findMany: jest.fn(),
  };
  const subscriptionDelegate = { updateMany: jest.fn() };
  const transactionClient = {
    maintenanceNotification: notificationDelegate,
    notificationDelivery: deliveryDelegate,
    pushSubscription: subscriptionDelegate,
  };
  const prisma = {
    ...transactionClient,
    $transaction: jest.fn(
      (operation: (tx: typeof transactionClient) => Promise<unknown>) =>
        operation(transactionClient),
    ),
  };
  const gateway = { send: jest.fn() };
  const processor = new PushNotificationsProcessor(
    prisma as unknown as PrismaService,
    gateway as unknown as WebPushGateway,
  );
  const job = {
    name: SEND_PUSH_NOTIFICATION_JOB,
    data: { notificationId: 'notification-1' },
  } as Job<SendPushNotificationJobData>;
  const notification = {
    id: 'notification-1',
    userId: 'user-1',
    vehicleId: 'vehicle-1',
    planId: 'plan-1',
    trigger: 'DATE',
    severity: 'OVERDUE',
    title: 'Maintenance alert',
    body: 'Oil change is overdue.',
    reason: 'Overdue by 3 day(s)',
    user: {
      pushSubscriptions: [
        {
          id: 'subscription-1',
          endpoint: 'https://push.example.test/1',
          p256dh: 'key',
          auth: 'secret',
        },
      ],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    gateway.send.mockResolvedValue(undefined);
    notificationDelegate.findUnique.mockResolvedValue(notification);
    notificationDelegate.update.mockResolvedValue({});
    notificationDelegate.updateMany.mockResolvedValue({ count: 1 });
    deliveryDelegate.upsert.mockResolvedValue({
      id: 'delivery-1',
      status: 'PENDING',
    });
    deliveryDelegate.updateMany.mockResolvedValue({ count: 1 });
    deliveryDelegate.findMany.mockResolvedValue([{ status: 'DELIVERED' }]);
    subscriptionDelegate.updateMany.mockResolvedValue({ count: 1 });
  });

  it('disables subscriptions rejected with HTTP 404 or 410', async () => {
    gateway.send.mockRejectedValue({ statusCode: 410, message: 'Gone' });
    deliveryDelegate.findMany.mockResolvedValue([
      { status: 'SUBSCRIPTION_DISABLED' },
    ]);

    await processor.process(job);

    expect(subscriptionDelegate.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'subscription-1',
        userId: 'user-1',
        disabledAt: null,
      },
      data: { disabledAt: expect.any(Date) as Date },
    });
    expect(deliveryDelegate.updateMany).toHaveBeenNthCalledWith(2, {
      where: {
        id: 'delivery-1',
        status: 'PROCESSING',
        processingToken: expect.any(String) as string,
      },
      data: {
        status: 'SUBSCRIPTION_DISABLED',
        processingToken: null,
        processingStartedAt: null,
        lastError: 'Gone',
      },
    });
    expect(notificationDelegate.update).toHaveBeenLastCalledWith({
      where: { id: 'notification-1' },
      data: { status: 'FAILED' },
    });
  });

  it('records transient failures and rethrows for BullMQ retry/backoff', async () => {
    gateway.send.mockRejectedValue(new Error('Temporary outage'));
    deliveryDelegate.findMany.mockResolvedValue([{ status: 'FAILED' }]);

    await expect(processor.process(job)).rejects.toThrow('Temporary outage');
    expect(deliveryDelegate.updateMany).toHaveBeenNthCalledWith(2, {
      where: {
        id: 'delivery-1',
        status: 'PROCESSING',
        processingToken: expect.any(String) as string,
      },
      data: {
        status: 'FAILED',
        processingToken: null,
        processingStartedAt: null,
        lastError: 'Temporary outage',
      },
    });
  });

  it('does not resend a delivery already recorded as delivered', async () => {
    deliveryDelegate.upsert.mockResolvedValue({
      id: 'delivery-1',
      status: 'DELIVERED',
    });
    deliveryDelegate.updateMany.mockResolvedValueOnce({ count: 0 });

    await processor.process(job);

    expect(gateway.send).not.toHaveBeenCalled();
    expect(notificationDelegate.update).toHaveBeenCalledWith({
      where: { id: 'notification-1' },
      data: { status: 'DELIVERED' },
    });
    expect(notificationDelegate.updateMany).toHaveBeenCalledWith({
      where: { id: 'notification-1', sentAt: null },
      data: { sentAt: expect.any(Date) as Date },
    });
  });

  it('claims a delivery atomically before sending it', async () => {
    await processor.process(job);

    expect(deliveryDelegate.updateMany).toHaveBeenNthCalledWith(1, {
      where: {
        id: 'delivery-1',
        OR: [
          { status: { in: ['PENDING', 'FAILED'] } },
          {
            status: 'PROCESSING',
            processingStartedAt: { lt: expect.any(Date) as Date },
          },
        ],
      },
      data: {
        status: 'PROCESSING',
        processingToken: expect.any(String) as string,
        processingStartedAt: expect.any(Date) as Date,
        attempts: { increment: 1 },
      },
    });
  });

  it('does not retry permanent Web Push client errors', async () => {
    gateway.send.mockRejectedValue({ statusCode: 400, message: 'Bad request' });
    deliveryDelegate.findMany.mockResolvedValue([{ status: 'FAILED' }]);

    await expect(processor.process(job)).resolves.toBeUndefined();
    expect(notificationDelegate.update).toHaveBeenCalledWith({
      where: { id: 'notification-1' },
      data: { status: 'FAILED' },
    });
  });

  it('retries later when another worker owns a fresh delivery lease', async () => {
    deliveryDelegate.updateMany.mockResolvedValueOnce({ count: 0 });
    deliveryDelegate.findMany.mockResolvedValue([{ status: 'PROCESSING' }]);

    await expect(processor.process(job)).rejects.toThrow(
      'Notification delivery is already being processed',
    );
    expect(gateway.send).not.toHaveBeenCalled();
    expect(notificationDelegate.update).not.toHaveBeenCalled();
  });
});
