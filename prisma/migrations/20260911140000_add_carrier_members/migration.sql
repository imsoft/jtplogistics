-- Usuarios que un proveedor (transportista) da de alta para su empresa.
--
-- Conservan el rol carrier, pero trabajan sobre los datos de su principal:
-- tarifas, mensajes y perfil de la empresa están amarrados al id del
-- principal. Los permisos solo aplican a ellos; el principal lo puede todo.
--
-- Quitar el acceso no borra al usuario (member_revoked_at): sus mensajes a JTP
-- se borrarían en cascada y la conversación perdería registro.

ALTER TABLE "users"
    ADD COLUMN "parent_carrier_id" TEXT,
    ADD COLUMN "member_can_view_rates" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "member_can_edit_rates" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "member_can_message" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "member_can_suggest" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "member_can_edit_company" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "member_revoked_at" TIMESTAMP(3);

ALTER TABLE "users" ADD CONSTRAINT "users_parent_carrier_id_fkey"
    FOREIGN KEY ("parent_carrier_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "users_parent_carrier_id_idx" ON "users"("parent_carrier_id");
