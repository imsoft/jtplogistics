-- Alta de proveedores: expediente y contrato de cada transportista que
-- Finanzas da de alta. Sustituye su Excel "Proceso de alta".
CREATE TYPE "OnboardingDocStatus" AS ENUM ('pending', 'received', 'not_applicable');
CREATE TYPE "ContractStatus" AS ENUM ('not_requested', 'requested_legal', 'sent_to_provider', 'received_signed', 'docs_updated');

CREATE TABLE "provider_onboardings" (
  "id" TEXT NOT NULL,
  "legal_name" TEXT NOT NULL,
  "commercial_name" TEXT NOT NULL,
  "prospect_id" TEXT,
  "started_on" DATE NOT NULL,
  "doc_alta_jtp" "OnboardingDocStatus" NOT NULL DEFAULT 'pending',
  "doc_billing" "OnboardingDocStatus" NOT NULL DEFAULT 'pending',
  "doc_tax_certificate" "OnboardingDocStatus" NOT NULL DEFAULT 'pending',
  "doc_opinion" "OnboardingDocStatus" NOT NULL DEFAULT 'pending',
  "doc_address_proof" "OnboardingDocStatus" NOT NULL DEFAULT 'pending',
  "doc_ine" "OnboardingDocStatus" NOT NULL DEFAULT 'pending',
  "doc_articles" "OnboardingDocStatus" NOT NULL DEFAULT 'pending',
  "doc_power" "OnboardingDocStatus" NOT NULL DEFAULT 'pending',
  "completed_on" DATE,
  "alta_authorized_by" TEXT,
  "contract_status" "ContractStatus" NOT NULL DEFAULT 'not_requested',
  "legal_requested_on" DATE,
  "legal_received_on" DATE,
  "sent_to_provider_on" DATE,
  "signed_received_on" DATE,
  "contract_authorized_by" TEXT,
  "notes" TEXT,
  "purchasing_notes" TEXT,
  "on_hold_since" DATE,
  "hold_reason" TEXT,
  "created_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "provider_onboardings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "provider_onboardings_prospect_id_key" ON "provider_onboardings"("prospect_id");
CREATE INDEX "provider_onboardings_contract_status_idx" ON "provider_onboardings"("contract_status");

ALTER TABLE "provider_onboardings"
  ADD CONSTRAINT "provider_onboardings_prospect_id_fkey" FOREIGN KEY ("prospect_id") REFERENCES "provider_prospects"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "provider_onboardings_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "users"
  ADD COLUMN "can_view_provider_onboardings" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "can_create_provider_onboardings" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "can_update_provider_onboardings" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "can_delete_provider_onboardings" BOOLEAN NOT NULL DEFAULT false;
