-- Checador fase 2: horarios por colaborador y las anotaciones que se le hacen.
--
-- Los horarios se guardan en minutos desde la medianoche y no como hora, para
-- que el cálculo no arrastre fechas ni zonas horarias: 9:00 son 540, 22:00 son
-- 1320. Si end_minute <= start_minute el turno cruza la medianoche.
--
-- Las incidencias se materializan en vez de calcularse al vuelo porque los
-- retardos "se consumen" al volverse falta: sin dejar constancia de cuáles se
-- comió cada falta, el cuarto retardo dispararía otra falta de inmediato.

CREATE TYPE "IncidentKind" AS ENUM ('retardo', 'falta', 'comida_larga', 'sin_comida');

CREATE TABLE "work_schedules" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "start_minute" INTEGER NOT NULL,
    "end_minute" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_schedules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "work_schedules_user_id_weekday_key" ON "work_schedules"("user_id", "weekday");

ALTER TABLE "work_schedules" ADD CONSTRAINT "work_schedules_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "time_clock_incidents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kind" "IncidentKind" NOT NULL,
    "work_date" DATE NOT NULL,
    "expires_on" DATE NOT NULL,
    "entry_id" TEXT,
    "consumed_by_id" TEXT,
    "minutes_late" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_clock_incidents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "time_clock_incidents_user_id_expires_on_idx" ON "time_clock_incidents"("user_id", "expires_on");

ALTER TABLE "time_clock_incidents" ADD CONSTRAINT "time_clock_incidents_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "time_clock_incidents" ADD CONSTRAINT "time_clock_incidents_entry_id_fkey"
    FOREIGN KEY ("entry_id") REFERENCES "time_clock_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "time_clock_incidents" ADD CONSTRAINT "time_clock_incidents_consumed_by_id_fkey"
    FOREIGN KEY ("consumed_by_id") REFERENCES "time_clock_incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Capturar y ver los horarios de los colaboradores. Lo lleva RH.
ALTER TABLE "users" ADD COLUMN "can_manage_schedules" BOOLEAN NOT NULL DEFAULT false;
