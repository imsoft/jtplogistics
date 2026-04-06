-- Tabla de tipos de unidad + target por ruta (una sola fila en `routes` por origen/destino lógico).

CREATE TABLE "route_unit_targets" (
    "id" TEXT NOT NULL,
    "route_id" TEXT NOT NULL,
    "unit_type" TEXT NOT NULL,
    "target" DOUBLE PRECISION,

    CONSTRAINT "route_unit_targets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "route_unit_targets_route_id_unit_type_key" ON "route_unit_targets"("route_id", "unit_type");

ALTER TABLE "route_unit_targets" ADD CONSTRAINT "route_unit_targets_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Una fila por ruta existente (compatibilidad con datos previos a esta tabla).
INSERT INTO "route_unit_targets" ("id", "route_id", "unit_type", "target")
SELECT gen_random_uuid()::text, r."id", r."unit_type", r."target"
FROM "routes" r;
