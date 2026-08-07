-- Tarifario por proveedor.

-- Condición pactada con el proveedor para cada ruta ("grado alimenticio, sin
-- filtraciones de luz ni de agua"): es la quinta columna del tarifario.
ALTER TABLE "carrier_routes" ADD COLUMN "terms" TEXT;

-- Cláusulas del tarifario. Van aparte de las de la cotización a cliente porque
-- son otro documento: crédito, estadías, flete en falso y viaje de prueba.
ALTER TABLE "quote_config" ADD COLUMN "tariff_terms_json" TEXT NOT NULL DEFAULT '';
