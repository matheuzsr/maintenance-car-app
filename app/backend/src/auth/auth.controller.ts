import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { AuthCookieService } from './auth-cookie.service';
import { AuthOriginService } from './auth-origin.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import {
  AccessTokenResponseDto,
  AuthResponseDto,
  LogoutResponseDto,
} from './dto/auth-response.dto';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly cookies: AuthCookieService,
    private readonly origins: AuthOriginService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Creates an account and starts a session' })
  @ApiCreatedResponse({ type: AuthResponseDto })
  @ApiConflictResponse({ description: 'Email is already registered' })
  @ApiTooManyRequestsResponse({ description: 'Too many attempts' })
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async register(
    @Body() dto: RegisterDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Ip() ipAddress: string,
  ) {
    this.origins.assertAllowed(request);
    const result = await this.auth.register(dto, {
      ipAddress,
      userAgent: request.get('user-agent'),
    });
    this.cookies.set(
      response,
      result.refreshToken,
      result.refreshTokenExpiresAt,
    );
    return { user: result.user, accessToken: result.accessToken };
  }

  @Post('login')
  @ApiOperation({ summary: 'Authenticates with email and password' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  @ApiTooManyRequestsResponse({ description: 'Too many attempts' })
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Ip() ipAddress: string,
  ) {
    this.origins.assertAllowed(request);
    const result = await this.auth.login(dto, {
      ipAddress,
      userAgent: request.get('user-agent'),
    });
    this.cookies.set(
      response,
      result.refreshToken,
      result.refreshTokenExpiresAt,
    );
    return { user: result.user, accessToken: result.accessToken };
  }

  @Post('refresh')
  @ApiOperation({
    summary: 'Rotates the refresh cookie and issues a new access token',
    description:
      'The browser sends the HttpOnly refresh cookie automatically. The response replaces it with a rotated cookie.',
  })
  @ApiCookieAuth('refresh-token')
  @ApiOkResponse({ type: AccessTokenResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Invalid or reused refresh token',
  })
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Ip() ipAddress: string,
  ) {
    this.origins.assertAllowed(request);
    const refreshToken = this.cookies.read(request);
    if (!refreshToken) throw new UnauthorizedException('Invalid refresh token');

    const tokens = await this.auth.refresh(refreshToken, {
      ipAddress,
      userAgent: request.get('user-agent'),
    });
    this.cookies.set(
      response,
      tokens.refreshToken,
      tokens.refreshTokenExpiresAt,
    );
    return { accessToken: tokens.accessToken };
  }

  @Post('logout')
  @ApiOperation({
    summary: 'Revokes the session associated with a refresh token',
    description:
      'Revokes the session from the HttpOnly refresh cookie and expires the cookie in the browser.',
  })
  @ApiCookieAuth('refresh-token')
  @ApiOkResponse({ type: LogoutResponseDto })
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ success: true }> {
    this.origins.assertAllowed(request);
    const refreshToken = this.cookies.read(request);
    try {
      if (refreshToken) await this.auth.logout(refreshToken);
      return { success: true };
    } finally {
      this.cookies.clear(response);
    }
  }
}
