-- Usuarios: avisos de rutas nuevas de clientes y cambio obligatorio de contraseña.
ALTER TABLE "users" ADD COLUMN "can_receive_client_route_alerts" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "must_change_password" BOOLEAN NOT NULL DEFAULT false;

-- Alta de proveedor: correo, RFC y la cuenta que se crea al completarla.
ALTER TABLE "provider_onboardings" ADD COLUMN "email" TEXT;
ALTER TABLE "provider_onboardings" ADD COLUMN "rfc" TEXT;
ALTER TABLE "provider_onboardings" ADD COLUMN "user_id" TEXT;
CREATE UNIQUE INDEX "provider_onboardings_user_id_key" ON "provider_onboardings"("user_id");
ALTER TABLE "provider_onboardings" ADD CONSTRAINT "provider_onboardings_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Direcciones del cliente en pares carga → entrega.
CREATE TABLE "client_address_pairs" (
  "id" TEXT NOT NULL,
  "client_id" TEXT NOT NULL,
  "route_id" TEXT NOT NULL,
  "origin_address" TEXT NOT NULL,
  "destination_address" TEXT NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "client_address_pairs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "client_address_pairs_client_id_route_id_idx" ON "client_address_pairs"("client_id", "route_id");
ALTER TABLE "client_address_pairs" ADD CONSTRAINT "client_address_pairs_client_id_fkey"
  FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_address_pairs" ADD CONSTRAINT "client_address_pairs_route_id_fkey"
  FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Las direcciones que ya había: la n-ésima de carga con la n-ésima de entrega de
-- la misma ruta. Si de un lado sobran, el otro queda vacío para completarlo.
INSERT INTO "client_address_pairs" ("id", "client_id", "route_id", "origin_address", "destination_address", "updated_at")
SELECT
  'cap' || md5(random()::text || clock_timestamp()::text),
  COALESCE(o.client_id, d.client_id),
  COALESCE(o.route_id, d.route_id),
  COALESCE(o.address, ''),
  COALESCE(d.address, ''),
  NOW()
FROM (
  SELECT client_id, route_id, address, ROW_NUMBER() OVER (PARTITION BY client_id, route_id ORDER BY updated_at, id) AS n
  FROM "client_locations" WHERE kind = 'origin' AND route_id IS NOT NULL
) o
FULL OUTER JOIN (
  SELECT client_id, route_id, address, ROW_NUMBER() OVER (PARTITION BY client_id, route_id ORDER BY updated_at, id) AS n
  FROM "client_locations" WHERE kind = 'destination' AND route_id IS NOT NULL
) d ON o.client_id = d.client_id AND o.route_id = d.route_id AND o.n = d.n;

DROP TABLE "client_locations";
