-- Datos fiscales del cliente para facturar con CFDI 4.0.
ALTER TABLE "clients" ADD COLUMN "tax_regime" TEXT,
ADD COLUMN "fiscal_zip" TEXT,
ADD COLUMN "cfdi_use" TEXT;
