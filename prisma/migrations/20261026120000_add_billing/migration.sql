-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('MXN', 'USD');

-- CreateEnum
CREATE TYPE "BillingKind" AS ENUM ('receivable', 'payable');

-- CreateEnum
CREATE TYPE "CfdiPaymentMethod" AS ENUM ('PUE', 'PPD');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "can_create_billing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "can_delete_billing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "can_update_billing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "can_view_billing" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "billing_documents" (
    "id" TEXT NOT NULL,
    "kind" "BillingKind" NOT NULL,
    "client_id" TEXT,
    "party_name" TEXT NOT NULL,
    "party_rfc" TEXT,
    "series" TEXT,
    "folio" TEXT NOT NULL,
    "uuid" TEXT,
    "issue_date" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'MXN',
    "exchange_rate" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "iva_rate" DOUBLE PRECISION NOT NULL DEFAULT 0.16,
    "iva" DOUBLE PRECISION NOT NULL,
    "iva_withheld" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "payment_method" "CfdiPaymentMethod" NOT NULL DEFAULT 'PPD',
    "concept" TEXT,
    "reference" TEXT,
    "notes" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "cancelled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_payments" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "paid_on" DATE NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "bank_account_id" TEXT NOT NULL,
    "bank_amount" DOUBLE PRECISION NOT NULL,
    "exchange_rate" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "payment_form" TEXT,
    "reference" TEXT,
    "notes" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bank" TEXT,
    "account_number" TEXT,
    "currency" "Currency" NOT NULL DEFAULT 'MXN',
    "initial_balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "initial_balance_on" DATE NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_movements" (
    "id" TEXT NOT NULL,
    "bank_account_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "concept" TEXT NOT NULL,
    "reference" TEXT,
    "reconciled" BOOLEAN NOT NULL DEFAULT false,
    "payment_id" TEXT,
    "expense_id" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "category" TEXT NOT NULL,
    "provider_name" TEXT,
    "description" TEXT NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'MXN',
    "exchange_rate" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "iva" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "uuid" TEXT,
    "bank_account_id" TEXT,
    "notes" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "billing_documents_kind_due_date_idx" ON "billing_documents"("kind", "due_date");

-- CreateIndex
CREATE INDEX "billing_documents_client_id_idx" ON "billing_documents"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_documents_kind_series_folio_party_name_key" ON "billing_documents"("kind", "series", "folio", "party_name");

-- CreateIndex
CREATE INDEX "billing_payments_document_id_idx" ON "billing_payments"("document_id");

-- CreateIndex
CREATE UNIQUE INDEX "bank_movements_payment_id_key" ON "bank_movements"("payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "bank_movements_expense_id_key" ON "bank_movements"("expense_id");

-- CreateIndex
CREATE INDEX "bank_movements_bank_account_id_date_idx" ON "bank_movements"("bank_account_id", "date");

-- CreateIndex
CREATE INDEX "expenses_date_idx" ON "expenses"("date");

-- AddForeignKey
ALTER TABLE "billing_documents" ADD CONSTRAINT "billing_documents_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_documents" ADD CONSTRAINT "billing_documents_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_payments" ADD CONSTRAINT "billing_payments_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "billing_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_payments" ADD CONSTRAINT "billing_payments_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_payments" ADD CONSTRAINT "billing_payments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_movements" ADD CONSTRAINT "bank_movements_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_movements" ADD CONSTRAINT "bank_movements_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "billing_payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_movements" ADD CONSTRAINT "bank_movements_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_movements" ADD CONSTRAINT "bank_movements_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

