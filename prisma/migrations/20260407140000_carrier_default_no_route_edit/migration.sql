-- Nuevos usuarios: por defecto pueden agregar rutas (can_add sigue true en schema) pero no editar las ya guardadas.
ALTER TABLE "users" ALTER COLUMN "can_edit_routes" SET DEFAULT false;
