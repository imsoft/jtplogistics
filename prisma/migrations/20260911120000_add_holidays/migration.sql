-- Días festivos del checador. Los administra solo dirección.
--
-- En un festivo se puede marcar igual, pero la jornada no se juzga: no hay
-- retardo, ni motivo obligatorio, ni incidencias. La fecha va como DATE, igual
-- que work_date en time_clock_entries, para compararlas sin conversiones.

CREATE TABLE "holidays" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "holidays_date_key" ON "holidays"("date");
