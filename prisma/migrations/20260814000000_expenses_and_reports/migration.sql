CREATE TYPE "ExpenseCategory" AS ENUM ('LABOR', 'PARTS', 'DIAGNOSTICS', 'TOWING', 'OTHER');

CREATE UNIQUE INDEX "maintenance_records_id_user_id_vehicle_id_key"
ON "maintenance_records"("id", "user_id", "vehicle_id");

CREATE TABLE "expenses" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "maintenance_record_id" UUID,
    "category" "ExpenseCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "incurred_at" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "expenses_amount_check" CHECK ("amount" >= 0)
);

CREATE INDEX "expenses_user_id_vehicle_id_incurred_at_idx"
ON "expenses"("user_id", "vehicle_id", "incurred_at");
CREATE INDEX "expenses_maintenance_record_id_idx"
ON "expenses"("maintenance_record_id");

ALTER TABLE "expenses" ADD CONSTRAINT "expenses_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_vehicle_id_user_id_fkey"
FOREIGN KEY ("vehicle_id", "user_id") REFERENCES "vehicles"("id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_maintenance_record_id_user_id_vehicle_id_fkey"
FOREIGN KEY ("maintenance_record_id", "user_id", "vehicle_id")
REFERENCES "maintenance_records"("id", "user_id", "vehicle_id") ON DELETE RESTRICT ON UPDATE CASCADE;
