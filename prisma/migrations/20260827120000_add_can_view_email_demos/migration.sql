-- Permiso para abrir la pantalla de correos de prueba, que hasta ahora era
-- exclusiva del admin. Recursos humanos la necesita para revisar cómo llegan
-- los correos del mural antes de publicar.
ALTER TABLE "users" ADD COLUMN "can_view_email_demos" BOOLEAN NOT NULL DEFAULT false;
