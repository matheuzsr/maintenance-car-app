import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';

describe('JwtStrategy', () => {
  const config = {
    getOrThrow: jest.fn().mockReturnValue('a'.repeat(32)),
  } as unknown as ConfigService;
  const findFirst = jest.fn();
  const prisma = { user: { findFirst } } as unknown as PrismaService;
  let strategy: JwtStrategy;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new JwtStrategy(config, prisma);
  });

  it('accepts an access token for an active user', async () => {
    findFirst.mockResolvedValue({ id: 'user-id' });

    await expect(
      strategy.validate({
        sub: 'user-id',
        email: 'user@example.com',
        type: 'access',
      }),
    ).resolves.toEqual({ userId: 'user-id', email: 'user@example.com' });
  });

  it('rejects a token for a deleted or missing user', async () => {
    findFirst.mockResolvedValue(null);

    await expect(
      strategy.validate({
        sub: 'other-user',
        email: 'other@example.com',
        type: 'access',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
