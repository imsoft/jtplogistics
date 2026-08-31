-- A quién se le hizo el mantenimiento, congelado al registrarlo: el equipo
-- puede reasignarse después y la evidencia debe seguir nombrando a la persona
-- que lo tenía ese día.
ALTER TABLE "maintenances" ADD COLUMN "recipient_name" TEXT;
