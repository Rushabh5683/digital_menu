-- Queue a distinct kitchen ticket for every guest order submission and add-on.
-- Existing orders intentionally start at sequence 0 and do not produce retroactive KOTs.
ALTER TABLE "Order" ADD COLUMN "customerKotSequence" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "OrderKotTicket" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "items" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAt" TIMESTAMP(3),
    "printedAt" TIMESTAMP(3),

    CONSTRAINT "OrderKotTicket_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrderKotTicket_orderId_sequence_key" ON "OrderKotTicket"("orderId", "sequence");
CREATE INDEX "OrderKotTicket_restaurantId_printedAt_createdAt_idx" ON "OrderKotTicket"("restaurantId", "printedAt", "createdAt");
CREATE INDEX "OrderKotTicket_orderId_idx" ON "OrderKotTicket"("orderId");

ALTER TABLE "OrderKotTicket" ADD CONSTRAINT "OrderKotTicket_restaurantId_fkey"
  FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderKotTicket" ADD CONSTRAINT "OrderKotTicket_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
