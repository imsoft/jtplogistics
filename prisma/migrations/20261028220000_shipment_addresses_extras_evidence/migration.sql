-- Direcciones de origen y destino por cliente.
CREATE TABLE IF NOT EXISTS "client_locations" (
  "id" TEXT NOT NULL,
  "client_id" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "client_locations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "client_locations_client_id_kind_city_key" ON "client_locations"("client_id", "kind", "city");
ALTER TABLE "client_locations" ADD CONSTRAINT "client_locations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Embarque: direcciones, costos extra y evidencias recibidas.
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "origin_address" TEXT;
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "destination_address" TEXT;
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "extra_costs" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "evidence_received_on" DATE;
