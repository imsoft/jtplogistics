-- Reloj checador, fase 1: solo el registro.
--
-- La tabla es append-only por diseño: no se edita ni se borra una checada
-- nunca. Por eso no lleva updated_at — una corrección (fase 2) será un
-- renglón nuevo que apunte al original, no un UPDATE sobre este.
--
-- work_date ancla la jornada al día en que EMPIEZA, para que un turno de
-- 22:00 a 06:00 deje sus cuatro marcas en la misma fecha.

CREATE TYPE "TimeClockMark" AS ENUM ('clock_in', 'lunch_start', 'lunch_end', 'clock_out');
CREATE TYPE "GeoStatus" AS ENUM ('granted', 'denied', 'unavailable');

CREATE TABLE "time_clock_entries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "mark" "TimeClockMark" NOT NULL,
    "marked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "work_date" DATE NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "device_id" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "accuracy_m" DOUBLE PRECISION,
    "distance_m" DOUBLE PRECISION,
    "geo_status" "GeoStatus",
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_clock_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "time_clock_entries_user_id_work_date_idx" ON "time_clock_entries"("user_id", "work_date");
CREATE INDEX "time_clock_entries_work_date_idx" ON "time_clock_entries"("work_date");

ALTER TABLE "time_clock_entries" ADD CONSTRAINT "time_clock_entries_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Ver el registro de TODOS. Marcar lo propio no pide permiso.
ALTER TABLE "users" ADD COLUMN "can_view_time_clock" BOOLEAN NOT NULL DEFAULT false;
