-- Prospección de proveedores: los transportistas que se están buscando, antes
-- de darlos de alta. Hoy se lleva en un Excel.
--
-- "descartado" es una etapa más y no una bandera aparte, porque se puede
-- descartar desde cualquier punto del proceso y siempre con un motivo.

CREATE TYPE "ProspectSource" AS ENUM ('carretera', 'whatsapp', 'internet', 'calle');
CREATE TYPE "ProspectCoverage" AS ENUM ('nacional', 'internacional', 'ambas');
CREATE TYPE "ProspectStatus" AS ENUM ('pendiente', 'prospectando', 'negociando', 'en_alta', 'listo', 'descartado');

CREATE TABLE "provider_prospects" (
    "id" TEXT NOT NULL,
    "commercial_name" TEXT NOT NULL,
    "contact_name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "source" "ProspectSource",
    "coverage" "ProspectCoverage",
    "status" "ProspectStatus" NOT NULL DEFAULT 'pendiente',
    "legal_name" TEXT,
    "city" TEXT,
    "contacted_on" DATE,
    "notes" TEXT,
    "discard_reason" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_prospects_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "provider_prospects_status_idx" ON "provider_prospects"("status");

ALTER TABLE "provider_prospects" ADD CONSTRAINT "provider_prospects_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Permiso propio: se puede prospectar sin ver a los proveedores ya dados de alta.
ALTER TABLE "users"
    ADD COLUMN "can_view_provider_prospects" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "can_create_provider_prospects" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "can_update_provider_prospects" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "can_delete_provider_prospects" BOOLEAN NOT NULL DEFAULT false;
