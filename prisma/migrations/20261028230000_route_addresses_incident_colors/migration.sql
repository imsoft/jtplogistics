-- Direcciones por ruta (varias por ciudad) en lugar de una por ciudad.
ALTER TABLE "client_locations" ADD COLUMN IF NOT EXISTS "route_id" TEXT;
DROP INDEX IF EXISTS "client_locations_client_id_kind_city_key";

-- Lo ya capturado por ciudad se copia a cada ruta del cliente que sale de
-- (origen) o llega a (destino) esa ciudad.
INSERT INTO "client_locations" ("id", "client_id", "kind", "city", "address", "updated_at", "route_id")
SELECT DISTINCT ON (l."id", r."id")
  'cl' || md5(l."id" || r."id"), l."client_id", l."kind", l."city", l."address", now(), r."id"
FROM "client_locations" l
JOIN "client_routes" cr ON cr."client_id" = l."client_id"
JOIN "routes" r ON r."id" = cr."route_id"
WHERE l."route_id" IS NULL
  AND lower(trim(CASE WHEN l."kind" = 'origin' THEN r."origin" ELSE r."destination" END)) = lower(trim(l."city"));
DELETE FROM "client_locations" WHERE "route_id" IS NULL;

ALTER TABLE "client_locations" ADD CONSTRAINT "client_locations_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "client_locations_client_id_route_id_idx" ON "client_locations"("client_id", "route_id");

-- Color por tipo de incidencia.
ALTER TABLE "incident_types" ADD COLUMN IF NOT EXISTS "color" TEXT;
