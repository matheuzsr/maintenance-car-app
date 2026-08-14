import { workerEnvValidationSchema } from './worker-env.validation';

describe('worker environment validation', () => {
  const base = {
    DATABASE_URL: 'postgresql://user:password@localhost:5432/database',
    REDIS_URL: 'redis://localhost:6379',
    VAPID_PUBLIC_KEY: Buffer.concat([
      Buffer.from([0x04]),
      Buffer.alloc(64),
    ]).toString('base64url'),
    VAPID_PRIVATE_KEY: Buffer.alloc(32).toString('base64url'),
    VAPID_SUBJECT: 'mailto:alerts@example.test',
  };

  it('accepts canonical Web Push VAPID credentials', () => {
    expect(workerEnvValidationSchema.validate(base).error).toBeUndefined();
  });

  it.each([
    [
      'a short public key',
      { VAPID_PUBLIC_KEY: Buffer.alloc(64).toString('base64url') },
    ],
    [
      'a compressed public key marker',
      {
        VAPID_PUBLIC_KEY: Buffer.concat([
          Buffer.from([0x02]),
          Buffer.alloc(64),
        ]).toString('base64url'),
      },
    ],
    [
      'a short private key',
      { VAPID_PRIVATE_KEY: Buffer.alloc(31).toString('base64url') },
    ],
    ['a noncanonical alphabet', { VAPID_PRIVATE_KEY: '*'.repeat(43) }],
  ])('rejects %s', (_case, change) => {
    expect(
      workerEnvValidationSchema.validate({ ...base, ...change }).error,
    ).toBeDefined();
  });
});
