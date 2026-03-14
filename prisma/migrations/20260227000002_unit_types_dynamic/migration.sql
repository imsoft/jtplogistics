-- Cambiar unit_type de enum a texto plano
ALTER TABLE "routes" ALTER COLUMN "unit_type" TYPE TEXT USING "unit_type"::TEXT;

-- Eliminar el enum UnitType
DROP TYPE IF EXISTS "UnitType";

-- Crear tabla de tipos de unidades
CREATE TABLE IF NOT EXISTS "unit_types" (
  "id"         TEXT NOT NULL,
  "name"       TEXT NOT NULL,
  "value"      TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "unit_types_pkey"         PRIMARY KEY ("id"),
  CONSTRAINT "unit_types_value_unique" UNIQUE ("value")
);

-- Insertar tipo inicial: Caja seca
INSERT INTO "unit_types" ("id", "name", "value", "created_at", "updated_at")
VALUES (gen_random_uuid()::text, 'Caja seca', 'dry_box', NOW(), NOW())
ON CONFLICT ("value") DO NOTHING;
