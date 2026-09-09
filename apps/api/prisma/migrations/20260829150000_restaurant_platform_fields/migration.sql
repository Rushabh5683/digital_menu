-- CreateEnum
CREATE TYPE "RestaurantStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING');

-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN "email" TEXT;
ALTER TABLE "Restaurant" ADD COLUMN "phone" TEXT;
ALTER TABLE "Restaurant" ADD COLUMN "address" TEXT;
ALTER TABLE "Restaurant" ADD COLUMN "status" "RestaurantStatus" NOT NULL DEFAULT 'PENDING';

-- Backfill existing restaurants as ACTIVE for the live demo
UPDATE "Restaurant" SET "status" = 'ACTIVE';

-- CreateIndex
CREATE INDEX "Restaurant_status_idx" ON "Restaurant"("status");

-- CreateIndex
CREATE INDEX "Restaurant_createdAt_idx" ON "Restaurant"("createdAt");
