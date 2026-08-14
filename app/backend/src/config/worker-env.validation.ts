import * as Joi from 'joi';

const vapidKey = Joi.string()
  .pattern(/^[A-Za-z0-9_-]+$/)
  .min(20)
  .required();

export const workerEnvValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  DATABASE_URL: Joi.string().uri().required(),
  REDIS_URL: Joi.string().uri().required(),
  NOTIFICATION_SCAN_INTERVAL_MS: Joi.number()
    .integer()
    .min(60_000)
    .default(900_000),
  VAPID_PUBLIC_KEY: vapidKey,
  VAPID_PRIVATE_KEY: vapidKey,
  VAPID_SUBJECT: Joi.string()
    .pattern(/^(mailto:|https:\/\/)/)
    .required(),
  WEB_PUSH_ALLOWED_HOSTS: Joi.string().default(
    'fcm.googleapis.com,updates.push.services.mozilla.com,web.push.apple.com,*.notify.windows.com',
  ),
});
