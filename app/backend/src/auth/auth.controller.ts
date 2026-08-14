import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import {
  AuthResponseDto,
  LogoutResponseDto,
  TokenPairResponseDto,
} from './dto/auth-response.dto';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Creates an account and starts a session' })
  @ApiCreatedResponse({ type: AuthResponseDto })
  @ApiConflictResponse({ description: 'Email is already registered' })
  @ApiTooManyRequestsResponse({ description: 'Too many attempts' })
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  register(
    @Body() dto: RegisterDto,
    @Req() request: Request,
    @Ip() ipAddress: string,
  ) {
    return this.auth.register(dto, {
      ipAddress,
      userAgent: request.get('user-agent'),
    });
  }

  @Post('login')
  @ApiOperation({ summary: 'Authenticates with email and password' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  @ApiTooManyRequestsResponse({ description: 'Too many attempts' })
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Ip() ipAddress: string,
  ) {
    return this.auth.login(dto, {
      ipAddress,
      userAgent: request.get('user-agent'),
    });
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Rotates the refresh token and issues new tokens' })
  @ApiOkResponse({ type: TokenPairResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Invalid or reused refresh token',
  })
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  refresh(
    @Body() dto: RefreshTokenDto,
    @Req() request: Request,
    @Ip() ipAddress: string,
  ) {
    return this.auth.refresh(dto.refreshToken, {
      ipAddress,
      userAgent: request.get('user-agent'),
    });
  }

  @Post('logout')
  @ApiOperation({
    summary: 'Revokes the session associated with a refresh token',
  })
  @ApiOkResponse({ type: LogoutResponseDto })
  @HttpCode(HttpStatus.OK)
  async logout(@Body() dto: RefreshTokenDto): Promise<{ success: true }> {
    await this.auth.logout(dto.refreshToken);
    return { success: true };
  }
}
