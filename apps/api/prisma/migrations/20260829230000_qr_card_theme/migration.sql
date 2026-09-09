-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "qrCardTheme" TEXT NOT NULL DEFAULT 'forest';
