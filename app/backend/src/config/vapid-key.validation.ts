import * as Joi from 'joi';

const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

export function vapidKeySchema(
  decodedLength: number,
  options: { publicKey?: boolean; allowEmpty?: boolean } = {},
): Joi.StringSchema {
  let schema = Joi.string().custom((value: string, helpers) => {
    if (!BASE64URL_PATTERN.test(value)) return helpers.error('any.invalid');
    const decoded = Buffer.from(value, 'base64url');
    if (
      decoded.length !== decodedLength ||
      decoded.toString('base64url') !== value ||
      (options.publicKey && decoded[0] !== 0x04)
    ) {
      return helpers.error('any.invalid');
    }
    return value;
  }, 'Web Push VAPID key validation');
  if (options.allowEmpty) schema = schema.allow('');
  return schema;
}

export function requireCompleteVapidConfiguration(
  value: Record<string, unknown>,
  helpers: Joi.CustomHelpers,
): Record<string, unknown> {
  const fields = [
    value.VAPID_PUBLIC_KEY,
    value.VAPID_PRIVATE_KEY,
    value.VAPID_SUBJECT,
  ];
  const configured = fields.map((field) => Boolean(field));
  if (configured.some(Boolean) && !configured.every(Boolean)) {
    return helpers.error('any.invalid') as unknown as Record<string, unknown>;
  }
  return value;
}
