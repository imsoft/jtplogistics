-- Notas de crédito sobre facturas.

-- AlterTable
ALTER TABLE "billing_attachments" ADD COLUMN     "credit_note_id" TEXT;

-- CreateTable
CREATE TABLE "billing_credit_notes" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "issue_date" DATE NOT NULL,
    "series" TEXT,
    "folio" TEXT,
    "uuid" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "iva" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "iva_withheld" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isr_withheld" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_credit_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "billing_credit_notes_document_id_idx" ON "billing_credit_notes"("document_id");

-- AddForeignKey
ALTER TABLE "billing_credit_notes" ADD CONSTRAINT "billing_credit_notes_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "billing_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_credit_notes" ADD CONSTRAINT "billing_credit_notes_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_attachments" ADD CONSTRAINT "billing_attachments_credit_note_id_fkey" FOREIGN KEY ("credit_note_id") REFERENCES "billing_credit_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

