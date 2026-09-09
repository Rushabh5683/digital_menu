-- Rename order status PENDING -> PLACED
ALTER TYPE "OrderStatus" RENAME VALUE 'PENDING' TO 'PLACED';

-- Order: add subtotal, rename placedAt -> createdAt, require tableId
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "subtotal" DECIMAL(10,2);

UPDATE "Order" SET "subtotal" = "total" WHERE "subtotal" IS NULL;

ALTER TABLE "Order" ALTER COLUMN "subtotal" SET NOT NULL;

-- Drop old table FK if present, then tighten tableId
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_tableId_fkey";

-- Fail-safe: delete orphan orders without table (demo data only)
DELETE FROM "OrderItem" WHERE "orderId" IN (SELECT "id" FROM "Order" WHERE "tableId" IS NULL);
DELETE FROM "Order" WHERE "tableId" IS NULL;

ALTER TABLE "Order" ALTER COLUMN "tableId" SET NOT NULL;

ALTER TABLE "Order" ADD CONSTRAINT "Order_tableId_fkey"
  FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Rename placedAt -> createdAt
ALTER TABLE "Order" RENAME COLUMN "placedAt" TO "createdAt";

DROP INDEX IF EXISTS "Order_restaurantId_placedAt_idx";
CREATE INDEX IF NOT EXISTS "Order_restaurantId_createdAt_idx" ON "Order"("restaurantId", "createdAt");
CREATE INDEX IF NOT EXISTS "Order_orderNumber_idx" ON "Order"("orderNumber");

-- OrderItem snapshot column renames
ALTER TABLE "OrderItem" RENAME COLUMN "dishName" TO "dishNameSnapshot";
ALTER TABLE "OrderItem" RENAME COLUMN "unitPrice" TO "priceSnapshot";
ALTER TABLE "OrderItem" RENAME COLUMN "lineTotal" TO "subtotal";
