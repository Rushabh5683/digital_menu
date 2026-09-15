-- AlterTable
ALTER TABLE "DayEndClose" ADD COLUMN "unlockedUntil" TIMESTAMP(3),
ADD COLUMN "unlockedByUserId" TEXT;
