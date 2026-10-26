-- Facturar desde el embarque: borradores sin folio, liga al embarque y foto de la Carta Porte.
ALTER TABLE "billing_documents" ADD COLUMN     "carta_porte" JSONB,
ADD COLUMN     "draft" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "shipment_id" TEXT,
ALTER COLUMN "folio" DROP NOT NULL;

CREATE INDEX "billing_documents_shipment_id_idx" ON "billing_documents"("shipment_id");

ALTER TABLE "billing_documents" ADD CONSTRAINT "billing_documents_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
