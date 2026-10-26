-- Cada registro de finanzas ligado a su embarque (uno por embarque).

-- AlterTable
ALTER TABLE "finances" ADD COLUMN     "shipment_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "finances_shipment_id_key" ON "finances"("shipment_id");

-- AddForeignKey
ALTER TABLE "finances" ADD CONSTRAINT "finances_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

