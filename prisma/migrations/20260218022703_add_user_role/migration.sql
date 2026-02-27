-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'carrier', 'collaborator');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'collaborator';
