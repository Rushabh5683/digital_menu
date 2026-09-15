-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'PART';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "paymentSplits" JSONB,
ADD COLUMN "staffAppreciationAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "OrderAppreciationShare" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "captainUserId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderAppreciationShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderAppreciationShare_orderId_idx" ON "OrderAppreciationShare"("orderId");

-- CreateIndex
CREATE INDEX "OrderAppreciationShare_captainUserId_createdAt_idx" ON "OrderAppreciationShare"("captainUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrderAppreciationShare_orderId_captainUserId_key" ON "OrderAppreciationShare"("orderId", "captainUserId");

-- AddForeignKey
ALTER TABLE "OrderAppreciationShare" ADD CONSTRAINT "OrderAppreciationShare_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderAppreciationShare" ADD CONSTRAINT "OrderAppreciationShare_captainUserId_fkey" FOREIGN KEY ("captainUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
