import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';

export const REFRESH_COOKIE_PATH = '/api/v1/auth';
export const REFRESH_COOKIE_NAME = 'maintenance_refresh';

@Injectable()
export class AuthCookieService {
  constructor(private readonly config: ConfigService) {}

  read(request: Request): string | undefined {
    const cookieHeader = request.get('cookie');
    if (!cookieHeader) return undefined;

    for (const part of cookieHeader.split(';')) {
      const separator = part.indexOf('=');
      if (
        separator === -1 ||
        part.slice(0, separator).trim() !== REFRESH_COOKIE_NAME
      ) {
        continue;
      }
      try {
        return decodeURIComponent(part.slice(separator + 1).trim());
      } catch {
        return undefined;
      }
    }
    return undefined;
  }

  set(response: Response, token: string, expiresAt: Date): void {
    response.cookie(REFRESH_COOKIE_NAME, token, {
      ...this.baseOptions,
      expires: expiresAt,
    });
  }

  clear(response: Response): void {
    response.clearCookie(REFRESH_COOKIE_NAME, this.baseOptions);
  }

  private get baseOptions() {
    return {
      httpOnly: true,
      secure: this.config.getOrThrow<boolean>('AUTH_COOKIE_SECURE'),
      sameSite: 'strict' as const,
      path: REFRESH_COOKIE_PATH,
    };
  }
}
