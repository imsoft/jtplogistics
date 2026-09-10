-- Permiso para cambiar el correo con el que un colaborador inicia sesión.
-- Va suelto y no pegado a can_update_employees porque no es editar la ficha:
-- le cierra la sesión y le cambia el acceso. Recursos humanos lo necesita
-- porque es quien mueve los puestos, junto con dirección y soporte TI.
ALTER TABLE "users" ADD COLUMN "can_change_employee_email" BOOLEAN NOT NULL DEFAULT false;
