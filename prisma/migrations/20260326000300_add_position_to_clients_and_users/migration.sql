-- AlterTable
ALTER TABLE "clients"
ADD COLUMN IF NOT EXISTS "position" TEXT;

-- AlterTable
ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "position" TEXT;
