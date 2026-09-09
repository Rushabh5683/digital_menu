-- AlterTable
ALTER TABLE "Table" ADD COLUMN "qrGeneratedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Session" ADD COLUMN "tableId" TEXT;

-- CreateIndex
CREATE INDEX "Session_tableId_idx" ON "Session"("tableId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE SET NULL ON UPDATE CASCADE;
