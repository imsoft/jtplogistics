-- AlterTable: permisos del módulo "Cotización marítima"
ALTER TABLE "users" ADD COLUMN     "can_view_maritime_quotes" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN     "can_create_maritime_quotes" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN     "can_update_maritime_quotes" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN     "can_delete_maritime_quotes" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "maritime_quotes" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "client" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'enviada',
    "valid_until" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maritime_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "maritime_quotes_reference_key" ON "maritime_quotes"("reference");

-- AddForeignKey
ALTER TABLE "maritime_quotes" ADD CONSTRAINT "maritime_quotes_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
