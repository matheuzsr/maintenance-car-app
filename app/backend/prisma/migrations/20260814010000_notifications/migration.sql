CREATE TYPE "NotificationTrigger" AS ENUM ('DATE', 'ODOMETER');
CREATE TYPE "NotificationSeverity" AS ENUM ('DUE_SOON', 'OVERDUE');
CREATE TYPE "NotificationDispatchStatus" AS ENUM ('PENDING', 'QUEUED', 'DELIVERED', 'PARTIALLY_FAILED', 'FAILED');
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED', 'SUBSCRIPTION_DISABLED');

CREATE TABLE "push_subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "user_agent" TEXT,
    "disabled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "maintenance_notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "dedup_key" TEXT NOT NULL,
    "trigger" "NotificationTrigger" NOT NULL,
    "severity" "NotificationSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "due_date" DATE,
    "due_odometer_km" INTEGER,
    "status" "NotificationDispatchStatus" NOT NULL DEFAULT 'PENDING',
    "queued_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "maintenance_notifications_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "maintenance_notifications_due_target_check" CHECK (
        ("trigger" = 'DATE' AND "due_date" IS NOT NULL AND "due_odometer_km" IS NULL)
        OR
        ("trigger" = 'ODOMETER' AND "due_date" IS NULL AND "due_odometer_km" IS NOT NULL)
    )
);

CREATE TABLE "notification_deliveries" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "notification_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "delivered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "notification_deliveries_attempts_check" CHECK ("attempts" >= 0)
);

CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");
CREATE UNIQUE INDEX "push_subscriptions_id_user_id_key" ON "push_subscriptions"("id", "user_id");
CREATE INDEX "push_subscriptions_user_id_disabled_at_idx" ON "push_subscriptions"("user_id", "disabled_at");

CREATE UNIQUE INDEX "maintenance_notifications_id_user_id_key" ON "maintenance_notifications"("id", "user_id");
CREATE UNIQUE INDEX "maintenance_notifications_user_id_dedup_key_key" ON "maintenance_notifications"("user_id", "dedup_key");
CREATE INDEX "maintenance_notifications_user_id_created_at_idx" ON "maintenance_notifications"("user_id", "created_at");
CREATE INDEX "maintenance_notifications_status_created_at_idx" ON "maintenance_notifications"("status", "created_at");
CREATE INDEX "maintenance_notifications_plan_id_trigger_severity_idx" ON "maintenance_notifications"("plan_id", "trigger", "severity");

CREATE UNIQUE INDEX "notification_deliveries_notification_id_subscription_id_key" ON "notification_deliveries"("notification_id", "subscription_id");
CREATE INDEX "notification_deliveries_user_id_status_created_at_idx" ON "notification_deliveries"("user_id", "status", "created_at");

ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "maintenance_notifications" ADD CONSTRAINT "maintenance_notifications_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "maintenance_notifications" ADD CONSTRAINT "maintenance_notifications_vehicle_id_user_id_fkey"
FOREIGN KEY ("vehicle_id", "user_id") REFERENCES "vehicles"("id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "maintenance_notifications" ADD CONSTRAINT "maintenance_notifications_plan_id_user_id_vehicle_id_fkey"
FOREIGN KEY ("plan_id", "user_id", "vehicle_id") REFERENCES "vehicle_maintenance_plans"("id", "user_id", "vehicle_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notification_id_user_id_fkey"
FOREIGN KEY ("notification_id", "user_id") REFERENCES "maintenance_notifications"("id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_subscription_id_user_id_fkey"
FOREIGN KEY ("subscription_id", "user_id") REFERENCES "push_subscriptions"("id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE;
