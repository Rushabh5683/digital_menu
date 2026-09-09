-- CreateTable
CREATE TABLE "DayEndClose" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "businessDate" TEXT NOT NULL,
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedByUserId" TEXT,
    "note" TEXT,
    "summaryJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DayEndClose_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DayEndClose_restaurantId_closedAt_idx" ON "DayEndClose"("restaurantId", "closedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DayEndClose_restaurantId_businessDate_key" ON "DayEndClose"("restaurantId", "businessDate");

-- AddForeignKey
ALTER TABLE "DayEndClose" ADD CONSTRAINT "DayEndClose_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DayEndClose" ADD CONSTRAINT "DayEndClose_closedByUserId_fkey" FOREIGN KEY ("closedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
