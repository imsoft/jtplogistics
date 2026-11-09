-- Prospección de clientes: tipos de unidad que necesita el prospecto (varios).
ALTER TABLE "client_leads" ADD COLUMN "unit_types" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
