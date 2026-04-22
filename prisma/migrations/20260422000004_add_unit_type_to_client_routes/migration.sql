-- Agregar unit_type a client_routes y ajustar constraint único

-- 1. Agregar columna con default vacío
ALTER TABLE "client_routes" ADD COLUMN "unit_type" TEXT NOT NULL DEFAULT '';

-- 2. Poblar unit_type desde el primer unitTarget de la ruta (o desde routes.unit_type como fallback)
UPDATE "client_routes" cr
SET unit_type = COALESCE(
  (SELECT rut.unit_type
   FROM route_unit_targets rut
   WHERE rut.route_id = cr.route_id
   ORDER BY rut.id
   LIMIT 1),
  (SELECT r.unit_type FROM routes r WHERE r.id = cr.route_id)
);

-- 3. Eliminar constraint único anterior
ALTER TABLE "client_routes" DROP CONSTRAINT IF EXISTS "client_routes_client_id_route_id_key";

-- 4. Agregar nuevo constraint único que incluye unit_type
ALTER TABLE "client_routes" ADD CONSTRAINT "client_routes_client_id_route_id_unit_type_key"
  UNIQUE ("client_id", "route_id", "unit_type");
