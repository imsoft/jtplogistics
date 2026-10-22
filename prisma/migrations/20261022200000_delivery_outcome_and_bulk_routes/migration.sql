-- Resultado de la entrega, que se conserva al cerrar el embarque.
ALTER TABLE "shipments" ADD COLUMN "delivery_outcome" TEXT;

-- Los embarques que hoy están en un estado de entrega ya tienen su resultado.
UPDATE "shipments"
SET "delivery_outcome" = "status"::text
WHERE "status" IN ('delivered', 'delivered_with_delay', 'not_delivered');

-- Rutas de carga masiva.
ALTER TABLE "routes" ADD COLUMN "bulk_imported" BOOLEAN NOT NULL DEFAULT false;

-- Las cargas viejas: días en que una misma persona dio de alta 10 rutas o
-- más. Ahí el "creado por" es quien subió el archivo, no quien hizo la ruta.
UPDATE "routes" r
SET "bulk_imported" = true
FROM (
  SELECT "created_by_id", date("created_at") AS d
  FROM "routes"
  WHERE "created_by_id" IS NOT NULL
  GROUP BY "created_by_id", date("created_at")
  HAVING count(*) >= 10
) b
WHERE r."created_by_id" = b."created_by_id" AND date(r."created_at") = b.d;
