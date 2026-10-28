-- Permiso suelto: recibir los avisos de Alta de proveedores (campana y correo).
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "can_receive_onboarding_alerts" BOOLEAN NOT NULL DEFAULT false;
