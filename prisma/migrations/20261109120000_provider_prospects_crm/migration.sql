-- Prospección de proveedores con las mismas funciones que la de clientes:
-- responsable, próximo seguimiento e historial de actividades.

ALTER TABLE "provider_prospects" ADD COLUMN "next_action" TEXT;
ALTER TABLE "provider_prospects" ADD COLUMN "next_follow_up_on" DATE;
ALTER TABLE "provider_prospects" ADD COLUMN "owner_id" TEXT;

ALTER TABLE "provider_prospects"
  ADD CONSTRAINT "provider_prospects_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "provider_prospects_owner_id_idx" ON "provider_prospects"("owner_id");
CREATE INDEX "provider_prospects_next_follow_up_on_idx" ON "provider_prospects"("next_follow_up_on");

-- Quien lo capturó queda como responsable, igual que al crear uno nuevo.
UPDATE "provider_prospects" SET "owner_id" = "created_by_id" WHERE "owner_id" IS NULL;

CREATE TABLE "provider_prospect_activities" (
  "id" TEXT NOT NULL,
  "prospect_id" TEXT NOT NULL,
  "type" "ClientLeadActivityType" NOT NULL,
  "summary" TEXT NOT NULL,
  "occurred_on" DATE NOT NULL,
  "author_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "provider_prospect_activities_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "provider_prospect_activities_prospect_id_idx" ON "provider_prospect_activities"("prospect_id");

ALTER TABLE "provider_prospect_activities"
  ADD CONSTRAINT "provider_prospect_activities_prospect_id_fkey" FOREIGN KEY ("prospect_id") REFERENCES "provider_prospects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "provider_prospect_activities"
  ADD CONSTRAINT "provider_prospect_activities_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
