-- AlterTable
ALTER TABLE "clients" ADD COLUMN "product_types" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
