-- AlterTable
ALTER TABLE "carrier_routes" ADD COLUMN "edit_unlock_requested" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "carrier_routes" ADD COLUMN "edit_unlock_approved" BOOLEAN NOT NULL DEFAULT false;
