-- Better Auth 1.7 busca la credencial por account_id = id del usuario. Las
-- cuentas creadas por la app guardaban ahí el correo, y al actualizar la
-- librería (2026-10-09) 12 personas dejaron de poder entrar. Solo datos.
UPDATE "accounts"
SET "account_id" = "user_id", "updated_at" = NOW()
WHERE "provider_id" = 'credential' AND "account_id" <> "user_id";
