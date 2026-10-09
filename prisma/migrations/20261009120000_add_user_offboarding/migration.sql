-- Baja laboral de colaboradores, conservando su historial.
ALTER TABLE "users"
  ADD COLUMN "offboarded_on" DATE,
  ADD COLUMN "offboard_reason" TEXT,
  ADD COLUMN "offboarded_by_name" TEXT;
