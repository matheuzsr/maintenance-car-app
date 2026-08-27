CREATE TABLE "expense_items" (
    "id" UUID NOT NULL,
    "expense_id" UUID NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_items_pkey" PRIMARY KEY ("id")
);

INSERT INTO "expense_items" (
    "id",
    "expense_id",
    "category",
    "description",
    "amount",
    "created_at",
    "updated_at"
)
SELECT
    gen_random_uuid(),
    "id",
    "category",
    "description",
    "amount",
    "created_at",
    "updated_at"
FROM "expenses";

CREATE INDEX "expense_items_expense_id_idx" ON "expense_items"("expense_id");

ALTER TABLE "expense_items"
ADD CONSTRAINT "expense_items_expense_id_fkey"
FOREIGN KEY ("expense_id") REFERENCES "expenses"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
