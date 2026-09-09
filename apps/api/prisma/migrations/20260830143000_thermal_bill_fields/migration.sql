-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "fssaiLicense" TEXT;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "billThanksMessage" TEXT DEFAULT 'Thanks for visiting us. Drive safe. Stay healthy.';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "roundOffAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;
