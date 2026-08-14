import * as Joi from 'joi';
import {
  requireCompleteVapidConfiguration,
  vapidKeySchema,
} from './vapid-key.validation';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  DATABASE_URL: Joi.string().uri().required(),
  REDIS_URL: Joi.string().uri().required(),
  NOTIFICATION_SCAN_INTERVAL_MS: Joi.number()
    .integer()
    .min(60_000)
    .default(900_000),
  CORS_ORIGIN: Joi.string().required(),
  TRUST_PROXY_HOPS: Joi.number()
    .integer()
    .min(0)
    .max(3)
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.number().min(1).required(),
      otherwise: Joi.number().default(0),
    }),
  AUTH_COOKIE_SECURE: Joi.boolean().when('NODE_ENV', {
    is: 'production',
    then: Joi.valid(true).required(),
    otherwise: Joi.boolean().default(false),
  }),
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string()
    .min(32)
    .invalid(Joi.ref('JWT_ACCESS_SECRET'))
    .required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('30d'),
  VAPID_PUBLIC_KEY: vapidKeySchema(65, {
    publicKey: true,
    allowEmpty: true,
  }).default(''),
  VAPID_PRIVATE_KEY: vapidKeySchema(32, { allowEmpty: true }).default(''),
  VAPID_SUBJECT: Joi.string()
    .pattern(/^(mailto:|https:\/\/)/)
    .allow('')
    .default(''),
  WEB_PUSH_ALLOWED_HOSTS: Joi.string().default(
    'fcm.googleapis.com,updates.push.services.mozilla.com,*.push.apple.com,*.notify.windows.com',
  ),
}).custom(requireCompleteVapidConfiguration, 'complete VAPID configuration');
