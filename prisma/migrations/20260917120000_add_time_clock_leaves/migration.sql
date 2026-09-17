-- Vacaciones, home office, incapacidad y permiso: periodos programados para
-- UNA persona, a diferencia de holidays, que aplica a toda la empresa.
--
-- Los cuatro dejan marcar desde donde sea. Solo el home office sigue siendo
-- día de trabajo y se le cuenta retardo contra su horario.
--
-- Las fechas van como DATE, inclusive las dos, para compararlas directo contra
-- work_date sin conversiones de zona horaria.

CREATE TYPE "LeaveKind" AS ENUM ('vacaciones', 'home_office', 'incapacidad', 'permiso');

CREATE TABLE "time_clock_leaves" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kind" "LeaveKind" NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "note" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_clock_leaves_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "time_clock_leaves_user_id_start_date_end_date_idx"
    ON "time_clock_leaves"("user_id", "start_date", "end_date");

ALTER TABLE "time_clock_leaves" ADD CONSTRAINT "time_clock_leaves_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "time_clock_leaves" ADD CONSTRAINT "time_clock_leaves_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
