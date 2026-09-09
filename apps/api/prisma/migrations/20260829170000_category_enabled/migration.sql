-- AlterTable
ALTER TABLE "Category" ADD COLUMN "isEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "Category_menuId_displayOrder_idx" ON "Category"("menuId", "displayOrder");
