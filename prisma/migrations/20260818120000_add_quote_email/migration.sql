-- Correo del contacto de la cotización: se imprime en el PDF junto al teléfono.
ALTER TABLE "generated_quotes" ADD COLUMN "email" TEXT;
