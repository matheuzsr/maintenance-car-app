export const MAINTENANCE_ALERTS_QUEUE = 'maintenance-alerts';
export const PUSH_NOTIFICATIONS_QUEUE = 'push-notifications';

export const SCAN_MAINTENANCE_ALERTS_JOB = 'scan-maintenance-alerts';
export const SEND_PUSH_NOTIFICATION_JOB = 'send-push-notification';
export const MAINTENANCE_ALERTS_SCHEDULER = 'maintenance-alerts-scheduler';

export interface SendPushNotificationJobData {
  notificationId: string;
}
