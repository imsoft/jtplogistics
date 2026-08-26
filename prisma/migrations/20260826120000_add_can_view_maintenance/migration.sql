-- Permiso de solo lectura sobre la bitácora de mantenimientos, para quien
-- lleva la certificación ISO 9001.
ALTER TABLE "users" ADD COLUMN "can_view_maintenance" BOOLEAN NOT NULL DEFAULT false;
