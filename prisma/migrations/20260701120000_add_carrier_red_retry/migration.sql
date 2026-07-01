-- AlterTable: segunda oportunidad para reajustar el target cuando quedó en rojo
ALTER TABLE "carrier_routes"
  ADD COLUMN "red_retry_used" BOOLEAN NOT NULL DEFAULT false;
