-- Renombrar dry_box a caja_seca en rutas existentes
UPDATE "routes" SET "unit_type" = 'caja_seca' WHERE "unit_type" = 'dry_box';

-- Actualizar valor en unit_types si existe
UPDATE "unit_types" SET "value" = 'caja_seca' WHERE "value" = 'dry_box';

-- Actualizar default de la columna
ALTER TABLE "routes" ALTER COLUMN "unit_type" SET DEFAULT 'caja_seca';
