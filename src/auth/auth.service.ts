import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { Prisma, User } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { RequestMetadata, TokenPair } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

interface RefreshPayload {
  sub: string;
  sid: string;
  type: 'refresh';
}

const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,p=4,t=3$j7P9pE5amXBDUKcP+1MRBg$gICPa2kmfCiMv9+iYfxbeA6qDtEasc9WzDi07ylpb9w';

class ConcurrentRefreshReuseError extends Error {}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto, metadata: RequestMetadata) {
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });
    try {
      const user = await this.prisma.user.create({
        data: {
          name: dto.name.trim(),
          email: dto.email.trim().toLowerCase(),
          passwordHash,
        },
      });
      return this.authenticationResponse(user, metadata);
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email is already registered');
      }
      throw error;
    }
  }

  async login(dto: LoginDto, metadata: RequestMetadata) {
    const user = await this.users.findActiveByEmail(
      dto.email.trim().toLowerCase(),
    );
    const passwordMatches = await argon2.verify(
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
      dto.password,
    );
    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.authenticationResponse(user, metadata);
  }

  async refresh(refreshToken: string, metadata: RequestMetadata) {
    const payload = await this.verifyRefreshToken(refreshToken);
    const session = await this.prisma.refreshSession.findUnique({
      where: { id: payload.sid },
      include: { user: true },
    });
    if (!session || session.userId !== payload.sub) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (!(await argon2.verify(session.tokenHash, refreshToken))) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (session.revokedAt) {
      await this.prisma.refreshSession.updateMany({
        where: { familyId: session.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    if (session.expiresAt <= new Date() || session.user.deletedAt) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.rotateSession(
      session.id,
      session.familyId,
      session.user,
      metadata,
    );
  }

  async logout(refreshToken: string): Promise<void> {
    const payload = await this.verifyRefreshToken(refreshToken);
    await this.prisma.refreshSession.updateMany({
      where: { id: payload.sid, userId: payload.sub, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async authenticationResponse(user: User, metadata: RequestMetadata) {
    const tokens = await this.createSession(user, metadata);
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        timezone: user.timezone,
      },
      ...tokens,
    };
  }

  private async createSession(
    user: User,
    metadata: RequestMetadata,
  ): Promise<TokenPair> {
    const sessionId = randomUUID();
    const tokens = await this.signTokens(user, sessionId);
    const refreshPayload = await this.verifyRefreshToken(tokens.refreshToken);
    await this.prisma.refreshSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        familyId: sessionId,
        tokenHash: await argon2.hash(tokens.refreshToken, {
          type: argon2.argon2id,
        }),
        expiresAt: new Date(refreshPayload.exp * 1000),
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      },
    });
    return tokens;
  }

  private async rotateSession(
    previousSessionId: string,
    familyId: string,
    user: User,
    metadata: RequestMetadata,
  ): Promise<TokenPair> {
    const nextSessionId = randomUUID();
    const tokens = await this.signTokens(user, nextSessionId);
    const payload = await this.verifyRefreshToken(tokens.refreshToken);
    const tokenHash = await argon2.hash(tokens.refreshToken, {
      type: argon2.argon2id,
    });

    try {
      await this.prisma.$transaction(async (tx) => {
        const revoked = await tx.refreshSession.updateMany({
          where: { id: previousSessionId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        if (revoked.count !== 1) throw new ConcurrentRefreshReuseError();
        await tx.refreshSession.create({
          data: {
            id: nextSessionId,
            userId: user.id,
            familyId,
            tokenHash,
            expiresAt: new Date(payload.exp * 1000),
            ipAddress: metadata.ipAddress,
            userAgent: metadata.userAgent,
          },
        });
        await tx.refreshSession.update({
          where: { id: previousSessionId },
          data: { replacedById: nextSessionId },
        });
      });
    } catch (error: unknown) {
      if (!(error instanceof ConcurrentRefreshReuseError)) throw error;
      await this.prisma.refreshSession.updateMany({
        where: { familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token reuse detected');
    }
    return tokens;
  }

  private async signTokens(user: User, sessionId: string): Promise<TokenPair> {
    const accessExpiresIn = this.config.getOrThrow<string>(
      'JWT_ACCESS_EXPIRES_IN',
    ) as JwtSignOptions['expiresIn'];
    const refreshExpiresIn = this.config.getOrThrow<string>(
      'JWT_REFRESH_EXPIRES_IN',
    ) as JwtSignOptions['expiresIn'];
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        { sub: user.id, email: user.email, type: 'access' },
        {
          secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
          expiresIn: accessExpiresIn,
          algorithm: 'HS256',
          issuer: 'maintenance-car-api',
          audience: 'maintenance-car-client',
        },
      ),
      this.jwt.signAsync(
        { sub: user.id, sid: sessionId, type: 'refresh' },
        {
          secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
          expiresIn: refreshExpiresIn,
          algorithm: 'HS256',
          issuer: 'maintenance-car-api',
          audience: 'maintenance-car-client',
        },
      ),
    ]);
    return { accessToken, refreshToken };
  }

  private async verifyRefreshToken(
    token: string,
  ): Promise<RefreshPayload & { exp: number }> {
    try {
      const payload = await this.jwt.verifyAsync<
        RefreshPayload & { exp: number }
      >(token, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        algorithms: ['HS256'],
        issuer: 'maintenance-car-api',
        audience: 'maintenance-car-client',
      });
      if (payload.type !== 'refresh') throw new Error('Unexpected token type');
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
