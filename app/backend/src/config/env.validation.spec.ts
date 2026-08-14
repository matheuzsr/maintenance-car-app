import { envValidationSchema } from './env.validation';

describe('environment validation', () => {
  const base = {
    PORT: 3000,
    DATABASE_URL: 'postgresql://user:password@localhost:5432/database',
    REDIS_URL: 'redis://localhost:6379',
    CORS_ORIGIN: 'https://cars.example',
    JWT_ACCESS_SECRET: 'access-secret-that-is-at-least-32-characters',
    JWT_REFRESH_SECRET: 'refresh-secret-that-is-at-least-32-characters',
  };

  it('requires secure cookies and a trusted proxy hop in production', () => {
    const insecure = envValidationSchema.validate({
      ...base,
      NODE_ENV: 'production',
      AUTH_COOKIE_SECURE: false,
      TRUST_PROXY_HOPS: 0,
    });
    expect(insecure.error).toBeDefined();

    const secure = envValidationSchema.validate({
      ...base,
      NODE_ENV: 'production',
      AUTH_COOKIE_SECURE: true,
      TRUST_PROXY_HOPS: 1,
    });
    expect(secure.error).toBeUndefined();
    expect(
      (secure.value as { AUTH_COOKIE_SECURE: boolean }).AUTH_COOKIE_SECURE,
    ).toBe(true);
  });

  it('defaults to an insecure cookie only outside production', () => {
    const result = envValidationSchema.validate({ ...base, NODE_ENV: 'test' });

    expect(result.error).toBeUndefined();
    const value = result.value as {
      AUTH_COOKIE_SECURE: boolean;
      TRUST_PROXY_HOPS: number;
    };
    expect(value.AUTH_COOKIE_SECURE).toBe(false);
    expect(value.TRUST_PROXY_HOPS).toBe(0);
  });
});
