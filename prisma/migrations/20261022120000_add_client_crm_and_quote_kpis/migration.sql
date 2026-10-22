-- CreateEnum
CREATE TYPE "ClientLeadStage" AS ENUM ('prospecto', 'contactado', 'cotizado', 'negociacion', 'ganado', 'perdido');

-- CreateEnum
CREATE TYPE "ClientLeadSource" AS ENUM ('referido', 'llamada', 'sitio_web', 'redes_sociales', 'expo', 'cliente_actual', 'otro');

-- CreateEnum
CREATE TYPE "ClientLeadActivityType" AS ENUM ('llamada', 'correo', 'whatsapp', 'reunion', 'visita', 'cotizacion', 'nota');

-- AlterTable
ALTER TABLE "generated_quotes" ADD COLUMN     "rejection_note" TEXT,
ADD COLUMN     "rejection_reason" TEXT;

-- AlterTable
ALTER TABLE "maritime_quotes" ADD COLUMN     "rejection_note" TEXT,
ADD COLUMN     "rejection_reason" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "can_create_client_leads" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "can_delete_client_leads" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "can_update_client_leads" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "can_view_client_leads" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "can_view_quote_kpis" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "client_leads" (
    "id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "contact_name" TEXT,
    "position" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "city" TEXT,
    "industry" TEXT,
    "source" "ClientLeadSource",
    "stage" "ClientLeadStage" NOT NULL DEFAULT 'prospecto',
    "estimated_monthly" DOUBLE PRECISION,
    "notes" TEXT,
    "lost_reason" TEXT,
    "next_action" TEXT,
    "next_follow_up_on" DATE,
    "owner_id" TEXT,
    "client_id" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_lead_activities" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "type" "ClientLeadActivityType" NOT NULL,
    "summary" TEXT NOT NULL,
    "occurred_on" DATE NOT NULL,
    "author_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_lead_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "client_leads_stage_idx" ON "client_leads"("stage");

-- CreateIndex
CREATE INDEX "client_leads_owner_id_idx" ON "client_leads"("owner_id");

-- CreateIndex
CREATE INDEX "client_leads_next_follow_up_on_idx" ON "client_leads"("next_follow_up_on");

-- CreateIndex
CREATE INDEX "client_lead_activities_lead_id_occurred_on_idx" ON "client_lead_activities"("lead_id", "occurred_on");

-- AddForeignKey
ALTER TABLE "client_leads" ADD CONSTRAINT "client_leads_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_leads" ADD CONSTRAINT "client_leads_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_leads" ADD CONSTRAINT "client_leads_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_lead_activities" ADD CONSTRAINT "client_lead_activities_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "client_leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_lead_activities" ADD CONSTRAINT "client_lead_activities_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

