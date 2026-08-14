import { validate } from 'class-validator';
import { CreatePushSubscriptionDto } from './create-push-subscription.dto';

function dto(p256dh: string, auth: string): CreatePushSubscriptionDto {
  return Object.assign(new CreatePushSubscriptionDto(), {
    endpoint: 'https://fcm.googleapis.com/fcm/send/example',
    p256dh,
    auth,
  });
}

describe('CreatePushSubscriptionDto', () => {
  it('accepts Web Push keys with the required decoded lengths', async () => {
    await expect(
      validate(
        dto(
          Buffer.alloc(65).toString('base64url'),
          Buffer.alloc(16).toString('base64url'),
        ),
      ),
    ).resolves.toHaveLength(0);
  });

  it.each([
    [
      'an invalid alphabet',
      '*'.repeat(87),
      Buffer.alloc(16).toString('base64url'),
    ],
    [
      'a short P-256 key',
      Buffer.alloc(64).toString('base64url'),
      Buffer.alloc(16).toString('base64url'),
    ],
    [
      'a short auth secret',
      Buffer.alloc(65).toString('base64url'),
      Buffer.alloc(15).toString('base64url'),
    ],
  ])('rejects %s', async (_case, p256dh, auth) => {
    await expect(validate(dto(p256dh, auth))).resolves.not.toHaveLength(0);
  });
});
