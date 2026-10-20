-- Add per-dish tax applicability and preserve it on every order line.
-- Defaults keep all existing dishes and historical order lines taxable.
ALTER TABLE "Dish" ADD COLUMN "isTaxApplicable" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "OrderItem" ADD COLUMN "isTaxApplicable" BOOLEAN NOT NULL DEFAULT true;
