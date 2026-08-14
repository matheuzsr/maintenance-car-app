import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Injectable()
export class AuthOriginService {
  constructor(private readonly config: ConfigService) {}

  assertAllowed(request: Request): void {
    const origin = request.get('origin');
    const fetchSite = request.get('sec-fetch-site');

    if (
      (origin && !this.allowedOrigins.includes(origin)) ||
      (!origin && fetchSite === 'cross-site')
    ) {
      throw new ForbiddenException('Origin is not allowed');
    }
  }

  private get allowedOrigins(): string[] {
    return this.config
      .getOrThrow<string>('CORS_ORIGIN')
      .split(',')
      .map((origin) => origin.trim());
  }
}
