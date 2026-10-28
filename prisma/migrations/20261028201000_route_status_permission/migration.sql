-- Permiso suelto: cambiar solo el estatus de una ruta (pricing).
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "can_change_route_status" BOOLEAN NOT NULL DEFAULT false;
