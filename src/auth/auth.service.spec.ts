import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const prisma = {} as PrismaService;
  const findActiveByEmail = jest.fn();
  const users = { findActiveByEmail } as unknown as UsersService;
  const jwt = {} as JwtService;
  const config = {} as ConfigService;
  const service = new AuthService(prisma, users, jwt, config);

  beforeEach(() => jest.clearAllMocks());

  it('returns the same generic error when the account does not exist', async () => {
    findActiveByEmail.mockResolvedValue(null);

    await expect(
      service.login(
        { email: 'missing@example.com', password: 'incorrect-password' },
        {},
      ),
    ).rejects.toEqual(new UnauthorizedException('Invalid email or password'));
  });

  it('normalizes the email before looking up an account', async () => {
    findActiveByEmail.mockResolvedValue(null);

    await expect(
      service.login(
        { email: ' USER@Example.COM ', password: 'incorrect-password' },
        {},
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(findActiveByEmail).toHaveBeenCalledWith('user@example.com');
  });
});
