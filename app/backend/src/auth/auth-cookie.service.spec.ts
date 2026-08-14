import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import {
  AuthCookieService,
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_PATH,
} from './auth-cookie.service';

describe('AuthCookieService', () => {
  const getOrThrow = jest.fn();
  const service = new AuthCookieService({
    getOrThrow,
  } as unknown as ConfigService);

  beforeEach(() => {
    jest.clearAllMocks();
    getOrThrow.mockReturnValue(true);
  });

  it('sets a production refresh cookie with the hardened attributes', () => {
    const cookie = jest.fn();
    const expiresAt = new Date('2026-09-13T12:00:00.000Z');

    service.set({ cookie } as unknown as Response, 'signed-token', expiresAt);

    expect(cookie).toHaveBeenCalledWith(REFRESH_COOKIE_NAME, 'signed-token', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: REFRESH_COOKIE_PATH,
      expires: expiresAt,
    });
  });

  it('reads only the exact refresh cookie name', () => {
    const request = {
      get: jest
        .fn()
        .mockReturnValue(
          `other=ignored; ${REFRESH_COOKIE_NAME}=signed%2Etoken`,
        ),
    } as unknown as Request;

    expect(service.read(request)).toBe('signed.token');
  });

  it('clears with the same security and scope attributes', () => {
    const clearCookie = jest.fn();

    service.clear({ clearCookie } as unknown as Response);

    expect(clearCookie).toHaveBeenCalledWith(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: REFRESH_COOKIE_PATH,
    });
  });
});
