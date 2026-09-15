-- CreateTable
CREATE TABLE "DayEndReopenLog" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "businessDate" TEXT NOT NULL,
    "reopenedByUserId" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DayEndReopenLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DayEndReopenLog_restaurantId_businessDate_idx" ON "DayEndReopenLog"("restaurantId", "businessDate");

-- CreateIndex
CREATE INDEX "DayEndReopenLog_createdAt_idx" ON "DayEndReopenLog"("createdAt");

-- AddForeignKey
ALTER TABLE "DayEndReopenLog" ADD CONSTRAINT "DayEndReopenLog_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DayEndReopenLog" ADD CONSTRAINT "DayEndReopenLog_reopenedByUserId_fkey" FOREIGN KEY ("reopenedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
