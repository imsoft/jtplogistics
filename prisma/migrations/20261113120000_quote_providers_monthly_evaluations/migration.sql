-- Proveedores con los que se cotizó cada cotización.
CREATE TABLE "quote_providers" (
  "id" TEXT NOT NULL,
  "quote_id" TEXT NOT NULL,
  "carrier_id" TEXT,
  "name" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "route_index" INTEGER,
  "created_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "quote_providers_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "quote_providers_quote_id_idx" ON "quote_providers"("quote_id");
ALTER TABLE "quote_providers" ADD CONSTRAINT "quote_providers_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "generated_quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quote_providers" ADD CONSTRAINT "quote_providers_carrier_id_fkey" FOREIGN KEY ("carrier_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "quote_providers" ADD CONSTRAINT "quote_providers_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Calificación de JTP en medias estrellas (4.5).
ALTER TABLE "carrier_manual_ratings" ALTER COLUMN "stars" TYPE DOUBLE PRECISION;

-- Evaluación mensual de cada proveedor (ajuste y comentario de JTP).
CREATE TABLE "carrier_monthly_evaluations" (
  "id" TEXT NOT NULL,
  "legal_name" TEXT NOT NULL,
  "month" TEXT NOT NULL,
  "stars" DOUBLE PRECISION,
  "comment" TEXT,
  "rated_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "carrier_monthly_evaluations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "carrier_monthly_evaluations_legal_name_month_key" ON "carrier_monthly_evaluations"("legal_name", "month");
ALTER TABLE "carrier_monthly_evaluations" ADD CONSTRAINT "carrier_monthly_evaluations_rated_by_id_fkey" FOREIGN KEY ("rated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
