import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationProducerService } from './notification-producer.service';

describe('NotificationProducerService', () => {
  const notificationDelegate = { updateMany: jest.fn() };
  const prisma = { maintenanceNotification: notificationDelegate };
  const queue = { add: jest.fn(), getJob: jest.fn() };
  const producer = new NotificationProducerService(
    queue as unknown as Queue<{ notificationId: string }>,
    prisma as unknown as PrismaService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    notificationDelegate.updateMany.mockResolvedValue({ count: 1 });
    queue.getJob.mockResolvedValue(undefined);
    queue.add.mockResolvedValue({});
  });

  it('claims the database row before publishing a new BullMQ job', async () => {
    await producer.enqueue('notification-1');

    expect(notificationDelegate.updateMany).toHaveBeenCalledWith({
      where: { id: 'notification-1', status: 'PENDING' },
      data: { status: 'QUEUED', queuedAt: expect.any(Date) as Date },
    });
    expect(
      notificationDelegate.updateMany.mock.invocationCallOrder[0],
    ).toBeLessThan(queue.add.mock.invocationCallOrder[0]);
    expect(queue.add).toHaveBeenCalledWith(
      'send-push-notification',
      { notificationId: 'notification-1' },
      expect.objectContaining({
        jobId: 'notification-1',
        attempts: 5,
      }),
    );
  });

  it('restores PENDING when publishing fails', async () => {
    queue.add.mockRejectedValue(new Error('Redis unavailable'));

    await expect(producer.enqueue('notification-1')).rejects.toThrow(
      'Redis unavailable',
    );

    expect(notificationDelegate.updateMany).toHaveBeenLastCalledWith({
      where: {
        id: 'notification-1',
        status: 'QUEUED',
        queuedAt: expect.any(Date) as Date,
      },
      data: { status: 'PENDING', queuedAt: null },
    });
  });

  it('reactivates a retained failed job and resets its attempts', async () => {
    const existingJob = {
      getState: jest.fn().mockResolvedValue('failed'),
      retry: jest.fn().mockResolvedValue(undefined),
    };
    queue.getJob.mockResolvedValue(existingJob);

    await producer.enqueue('notification-1');

    expect(queue.add).not.toHaveBeenCalled();
    expect(existingJob.retry).toHaveBeenCalledWith('failed', {
      resetAttemptsMade: true,
      resetAttemptsStarted: true,
    });
  });

  it('does not republish a notification already claimed elsewhere', async () => {
    notificationDelegate.updateMany.mockResolvedValue({ count: 0 });

    await producer.enqueue('notification-1');

    expect(queue.getJob).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });
});
