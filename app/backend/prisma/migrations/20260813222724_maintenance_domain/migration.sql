-- CreateEnum
CREATE TYPE "MaintenanceCategory" AS ENUM ('ENGINE', 'FILTERS', 'BRAKES', 'TRANSMISSION', 'SUSPENSION', 'TIRES', 'ELECTRICAL', 'COOLING', 'OTHER');

-- CreateTable
CREATE TABLE "maintenance_templates" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "MaintenanceCategory" NOT NULL,
    "suggested_interval_months" INTEGER,
    "suggested_interval_km" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_templates_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "maintenance_templates_interval_check" CHECK ("suggested_interval_months" IS NOT NULL OR "suggested_interval_km" IS NOT NULL),
    CONSTRAINT "maintenance_templates_months_check" CHECK ("suggested_interval_months" IS NULL OR "suggested_interval_months" > 0),
    CONSTRAINT "maintenance_templates_km_check" CHECK ("suggested_interval_km" IS NULL OR "suggested_interval_km" > 0)
);

-- CreateTable
CREATE TABLE "vehicle_maintenance_plans" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "template_id" UUID,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "MaintenanceCategory" NOT NULL,
    "interval_months" INTEGER,
    "interval_km" INTEGER,
    "alert_before_days" INTEGER NOT NULL DEFAULT 30,
    "alert_before_km" INTEGER NOT NULL DEFAULT 1000,
    "last_performed_at" TIMESTAMP(3),
    "last_performed_odometer_km" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "vehicle_maintenance_plans_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "vehicle_maintenance_plans_interval_check" CHECK ("interval_months" IS NOT NULL OR "interval_km" IS NOT NULL),
    CONSTRAINT "vehicle_maintenance_plans_months_check" CHECK ("interval_months" IS NULL OR "interval_months" > 0),
    CONSTRAINT "vehicle_maintenance_plans_km_check" CHECK ("interval_km" IS NULL OR "interval_km" > 0),
    CONSTRAINT "vehicle_maintenance_plans_alert_days_check" CHECK ("alert_before_days" >= 0),
    CONSTRAINT "vehicle_maintenance_plans_alert_km_check" CHECK ("alert_before_km" >= 0),
    CONSTRAINT "vehicle_maintenance_plans_last_odometer_check" CHECK ("last_performed_odometer_km" IS NULL OR "last_performed_odometer_km" >= 0)
);

-- CreateTable
CREATE TABLE "maintenance_records" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "plan_id" UUID,
    "odometer_reading_id" UUID,
    "description" TEXT NOT NULL,
    "performed_at" TIMESTAMP(3) NOT NULL,
    "odometer_km" INTEGER NOT NULL,
    "workshop" TEXT,
    "notes" TEXT,
    "total_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "maintenance_records_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "maintenance_records_odometer_check" CHECK ("odometer_km" >= 0),
    CONSTRAINT "maintenance_records_cost_check" CHECK ("total_cost" >= 0)
);

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_templates_slug_key" ON "maintenance_templates"("slug");

-- CreateIndex
CREATE INDEX "maintenance_templates_active_category_idx" ON "maintenance_templates"("active", "category");

-- CreateIndex
CREATE INDEX "vehicle_maintenance_plans_user_id_vehicle_id_active_deleted_idx" ON "vehicle_maintenance_plans"("user_id", "vehicle_id", "active", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_maintenance_plans_id_user_id_vehicle_id_key" ON "vehicle_maintenance_plans"("id", "user_id", "vehicle_id");

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_records_odometer_reading_id_key" ON "maintenance_records"("odometer_reading_id");

-- CreateIndex
CREATE INDEX "maintenance_records_user_id_vehicle_id_performed_at_idx" ON "maintenance_records"("user_id", "vehicle_id", "performed_at");

-- CreateIndex
CREATE INDEX "maintenance_records_plan_id_performed_at_idx" ON "maintenance_records"("plan_id", "performed_at");

-- AddForeignKey
ALTER TABLE "vehicle_maintenance_plans" ADD CONSTRAINT "vehicle_maintenance_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_maintenance_plans" ADD CONSTRAINT "vehicle_maintenance_plans_vehicle_id_user_id_fkey" FOREIGN KEY ("vehicle_id", "user_id") REFERENCES "vehicles"("id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_maintenance_plans" ADD CONSTRAINT "vehicle_maintenance_plans_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "maintenance_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_vehicle_id_user_id_fkey" FOREIGN KEY ("vehicle_id", "user_id") REFERENCES "vehicles"("id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_plan_id_user_id_vehicle_id_fkey" FOREIGN KEY ("plan_id", "user_id", "vehicle_id") REFERENCES "vehicle_maintenance_plans"("id", "user_id", "vehicle_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_odometer_reading_id_fkey" FOREIGN KEY ("odometer_reading_id") REFERENCES "odometer_readings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
