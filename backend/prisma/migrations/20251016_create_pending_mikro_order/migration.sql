-- CreateTable
CREATE TABLE IF NOT EXISTS "PendingMikroOrder" (
    "id" TEXT NOT NULL,
    "mikroOrderNumber" TEXT NOT NULL,
    "orderSeries" TEXT NOT NULL,
    "orderSequence" INTEGER NOT NULL,
    "customerCode" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL,
    "deliveryDate" TIMESTAMP(3),
    "items" JSONB NOT NULL,
    "itemCount" INTEGER NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "totalVAT" DOUBLE PRECISION NOT NULL,
    "grandTotal" DOUBLE PRECISION NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "emailSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PendingMikroOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PendingMikroOrder_mikroOrderNumber_key" ON "PendingMikroOrder"("mikroOrderNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PendingMikroOrder_customerCode_idx" ON "PendingMikroOrder"("customerCode");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PendingMikroOrder_mikroOrderNumber_idx" ON "PendingMikroOrder"("mikroOrderNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PendingMikroOrder_syncedAt_idx" ON "PendingMikroOrder"("syncedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PendingMikroOrder_emailSent_idx" ON "PendingMikroOrder"("emailSent");
