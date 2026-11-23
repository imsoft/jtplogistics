-- Cotizador del que sale cada cotización: nacional (todas las existentes) o internacional.
ALTER TABLE "generated_quotes" ADD COLUMN "scope" TEXT NOT NULL DEFAULT 'nacional';
CREATE INDEX "generated_quotes_scope_idx" ON "generated_quotes"("scope");
