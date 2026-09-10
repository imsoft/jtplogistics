-- Checador fase 2b: correcciones de dirección y banderas automáticas.
--
-- La corrección NO modifica la checada original: es un renglón nuevo que
-- apunta a ella, con motivo y autor, y en pantalla se ven las dos. La tabla
-- sigue siendo append-only.
--
-- Las banderas se calculan al momento de marcar y se guardan. No se recalculan
-- después a propósito: la configuración de la oficina cambia con el tiempo y
-- el registro tiene que decir qué se sabía aquel día, no qué sabemos hoy.

CREATE TYPE "CorrectionKind" AS ENUM ('adjust', 'void', 'add');

ALTER TABLE "time_clock_entries"
    ADD COLUMN "outside_geofence" BOOLEAN,
    ADD COLUMN "foreign_network" BOOLEAN,
    ADD COLUMN "shared_device" BOOLEAN,
    ADD COLUMN "correction_kind" "CorrectionKind",
    ADD COLUMN "correction_of_id" TEXT,
    ADD COLUMN "corrected_by_id" TEXT,
    ADD COLUMN "correction_reason" TEXT;

ALTER TABLE "time_clock_entries" ADD CONSTRAINT "time_clock_entries_correction_of_id_fkey"
    FOREIGN KEY ("correction_of_id") REFERENCES "time_clock_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "time_clock_entries" ADD CONSTRAINT "time_clock_entries_corrected_by_id_fkey"
    FOREIGN KEY ("corrected_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "time_clock_entries_correction_of_id_idx" ON "time_clock_entries"("correction_of_id");
