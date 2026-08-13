import { Test } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: { $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]) },
        },
      ],
    }).compile();
    controller = module.get(HealthController);
  });

  it('returns liveness status', () => {
    expect(controller.live()).toEqual({ status: 'ok' });
  });

  it('returns readiness status when the database responds', async () => {
    await expect(controller.ready()).resolves.toEqual({ status: 'ok' });
  });
});
