-- AlterTable
ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "can_add_routes" BOOLEAN NOT NULL DEFAULT true;
