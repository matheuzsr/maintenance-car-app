import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webPush from 'web-push';
import { isAllowedPushEndpoint } from './push-endpoint-policy';

export interface WebPushSubscriptionData {
  endpoint: string;
  p256dh: string;
  auth: string;
}

@Injectable()
export class WebPushGateway {
  private readonly configured: boolean;

  constructor(private readonly config: ConfigService) {
    const subject = this.config.get<string>('VAPID_SUBJECT') ?? '';
    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY') ?? '';
    const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY') ?? '';
    this.configured = Boolean(subject && publicKey && privateKey);
    if (this.configured) {
      webPush.setVapidDetails(subject, publicKey, privateKey);
    }
  }

  async send(
    subscription: WebPushSubscriptionData,
    payload: Record<string, unknown>,
  ): Promise<void> {
    if (!this.configured) {
      throw new Error('Web Push VAPID credentials are not configured');
    }
    if (
      !isAllowedPushEndpoint(
        subscription.endpoint,
        this.config.getOrThrow<string>('WEB_PUSH_ALLOWED_HOSTS'),
      )
    ) {
      throw new Error('Push service host is not allowed');
    }
    const notificationId = payload.notificationId;
    const topic =
      typeof notificationId === 'string'
        ? notificationId.replaceAll('-', '').slice(0, 32)
        : undefined;
    await webPush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
      { TTL: 86_400, urgency: 'normal', ...(topic ? { topic } : {}) },
    );
  }
}
