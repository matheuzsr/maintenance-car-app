ALTER TABLE "notification_deliveries"
ADD COLUMN "processing_token" UUID,
ADD COLUMN "processing_started_at" TIMESTAMP(3);

ALTER TABLE "notification_deliveries"
ADD CONSTRAINT "notification_deliveries_processing_lease_check" CHECK (
    ("status" = 'PROCESSING' AND "processing_token" IS NOT NULL AND "processing_started_at" IS NOT NULL)
    OR
    ("status" <> 'PROCESSING' AND "processing_token" IS NULL AND "processing_started_at" IS NULL)
);

CREATE INDEX "notification_deliveries_status_processing_started_at_idx"
ON "notification_deliveries"("status", "processing_started_at");
