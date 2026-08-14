import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { AuthOriginService } from './auth-origin.service';

describe('AuthOriginService', () => {
  const service = new AuthOriginService({
    getOrThrow: jest
      .fn()
      .mockReturnValue('https://cars.example, http://localhost:3001'),
  } as unknown as ConfigService);

  it('accepts an exact configured browser origin', () => {
    expect(() =>
      service.assertAllowed(requestWith({ origin: 'https://cars.example' })),
    ).not.toThrow();
  });

  it('rejects an untrusted or null browser origin', () => {
    expect(() =>
      service.assertAllowed(requestWith({ origin: 'https://evil.example' })),
    ).toThrow(new ForbiddenException('Origin is not allowed'));
    expect(() =>
      service.assertAllowed(requestWith({ origin: 'null' })),
    ).toThrow(new ForbiddenException('Origin is not allowed'));
  });

  it('allows non-browser clients without Origin but rejects cross-site fetch metadata', () => {
    expect(() => service.assertAllowed(requestWith({}))).not.toThrow();
    expect(() =>
      service.assertAllowed(requestWith({ 'sec-fetch-site': 'cross-site' })),
    ).toThrow(new ForbiddenException('Origin is not allowed'));
  });

  function requestWith(headers: Record<string, string>): Request {
    return {
      get: jest.fn((name: string) => headers[name.toLowerCase()]),
    } as unknown as Request;
  }
});
