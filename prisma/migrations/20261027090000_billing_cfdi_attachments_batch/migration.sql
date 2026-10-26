-- XML/PDF de facturas, retención de ISR y un cobro que paga varias facturas.

-- AlterTable
ALTER TABLE "billing_documents" ADD COLUMN     "isr_withheld" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "billing_payments" ADD COLUMN     "batch_movement_id" TEXT;

-- CreateTable
CREATE TABLE "billing_attachments" (
    "id" TEXT NOT NULL,
    "document_id" TEXT,
    "kind" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storage_id" TEXT NOT NULL,
    "cfdi" JSONB,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "billing_attachments_document_id_idx" ON "billing_attachments"("document_id");

-- CreateIndex
CREATE INDEX "billing_payments_batch_movement_id_idx" ON "billing_payments"("batch_movement_id");

-- AddForeignKey
ALTER TABLE "billing_payments" ADD CONSTRAINT "billing_payments_batch_movement_id_fkey" FOREIGN KEY ("batch_movement_id") REFERENCES "bank_movements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_attachments" ADD CONSTRAINT "billing_attachments_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "billing_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_attachments" ADD CONSTRAINT "billing_attachments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

