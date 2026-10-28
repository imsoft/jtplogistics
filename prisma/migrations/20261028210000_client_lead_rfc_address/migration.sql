-- CRM de clientes: RFC y dirección del prospecto.
ALTER TABLE "client_leads" ADD COLUMN IF NOT EXISTS "rfc" TEXT;
ALTER TABLE "client_leads" ADD COLUMN IF NOT EXISTS "address" TEXT;
