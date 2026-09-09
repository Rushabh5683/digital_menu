-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'UPI_GPAY', 'UPI_PHONEPE', 'UPI_OTHER', 'OTHER');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "billPrintedAt" TIMESTAMP(3),
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentMethod" "PaymentMethod",
ADD COLUMN     "paymentNote" TEXT;

-- CreateIndex
CREATE INDEX "Order_restaurantId_paymentMethod_idx" ON "Order"("restaurantId", "paymentMethod");
