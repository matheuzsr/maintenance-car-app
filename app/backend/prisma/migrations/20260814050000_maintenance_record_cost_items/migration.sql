CREATE TABLE "maintenance_record_cost_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "maintenance_record_id" UUID NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_record_cost_items_pkey" PRIMARY KEY ("id")
);

INSERT INTO "maintenance_record_cost_items" (
    "maintenance_record_id",
    "category",
    "description",
    "amount",
    "created_at",
    "updated_at"
)
SELECT
    "id",
    'OTHER'::"ExpenseCategory",
    "description",
    "total_cost",
    "created_at",
    "updated_at"
FROM "maintenance_records"
WHERE "total_cost" > 0;

CREATE INDEX "maintenance_record_cost_items_maintenance_record_id_idx"
    ON "maintenance_record_cost_items"("maintenance_record_id");

ALTER TABLE "maintenance_record_cost_items"
    ADD CONSTRAINT "maintenance_record_cost_items_maintenance_record_id_fkey"
    FOREIGN KEY ("maintenance_record_id")
    REFERENCES "maintenance_records"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
