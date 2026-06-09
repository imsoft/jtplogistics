-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('borrador', 'enviada', 'negociacion', 'aceptada', 'rechazada');

-- AlterTable
ALTER TABLE "generated_quotes" ADD COLUMN     "status" "QuoteStatus" NOT NULL DEFAULT 'enviada';
