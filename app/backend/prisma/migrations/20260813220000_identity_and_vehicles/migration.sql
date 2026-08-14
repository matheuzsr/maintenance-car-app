CREATE TYPE "OdometerReadingSource" AS ENUM ('MANUAL', 'MAINTENANCE_RECORD');

CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "refresh_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "replaced_by_id" UUID,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "refresh_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "vehicles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "nickname" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "license_plate" TEXT,
    "current_odometer_km" INTEGER NOT NULL,
    "current_odometer_recorded_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "vehicles_year_check" CHECK ("year" >= 1886 AND "year" <= 2200),
    CONSTRAINT "vehicles_odometer_check" CHECK ("current_odometer_km" >= 0)
);

CREATE TABLE "odometer_readings" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "odometer_km" INTEGER NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL,
    "source" "OdometerReadingSource" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "odometer_readings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "odometer_readings_odometer_check" CHECK ("odometer_km" >= 0)
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");
CREATE INDEX "refresh_sessions_user_id_revoked_at_idx" ON "refresh_sessions"("user_id", "revoked_at");
CREATE INDEX "refresh_sessions_family_id_revoked_at_idx" ON "refresh_sessions"("family_id", "revoked_at");
CREATE INDEX "refresh_sessions_expires_at_idx" ON "refresh_sessions"("expires_at");
CREATE INDEX "vehicles_user_id_deleted_at_idx" ON "vehicles"("user_id", "deleted_at");
CREATE UNIQUE INDEX "vehicles_id_user_id_key" ON "vehicles"("id", "user_id");
CREATE INDEX "odometer_readings_vehicle_id_recorded_at_idx" ON "odometer_readings"("vehicle_id", "recorded_at");
CREATE INDEX "odometer_readings_user_id_vehicle_id_idx" ON "odometer_readings"("user_id", "vehicle_id");

ALTER TABLE "refresh_sessions" ADD CONSTRAINT "refresh_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "refresh_sessions" ADD CONSTRAINT "refresh_sessions_replaced_by_id_fkey" FOREIGN KEY ("replaced_by_id") REFERENCES "refresh_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "odometer_readings" ADD CONSTRAINT "odometer_readings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "odometer_readings" ADD CONSTRAINT "odometer_readings_vehicle_id_user_id_fkey" FOREIGN KEY ("vehicle_id", "user_id") REFERENCES "vehicles"("id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE;
