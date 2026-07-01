-- AlterTable: campos de inventario de equipo para laptops
ALTER TABLE "laptops"
  ADD COLUMN "equipment_code" TEXT,
  ADD COLUMN "color" TEXT,
  ADD COLUMN "observations" TEXT,
  ADD COLUMN "maintenance_provider" TEXT,
  ADD COLUMN "image_url" TEXT,
  ADD COLUMN "image_public_id" TEXT;

-- AlterTable: campos de inventario de equipo para teléfonos
ALTER TABLE "phones"
  ADD COLUMN "equipment_code" TEXT,
  ADD COLUMN "serial_number" TEXT,
  ADD COLUMN "brand" TEXT,
  ADD COLUMN "model" TEXT,
  ADD COLUMN "observations" TEXT,
  ADD COLUMN "maintenance_provider" TEXT,
  ADD COLUMN "image_url" TEXT,
  ADD COLUMN "image_public_id" TEXT;
