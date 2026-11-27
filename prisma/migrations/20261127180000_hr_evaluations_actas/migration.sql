-- Evaluaciones de colaboradores (RH y dirección) y actas administrativas guardadas.
CREATE TABLE "employee_evaluations" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "stars" DOUBLE PRECISION NOT NULL,
    "comment" TEXT,
    "evaluated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "employee_evaluations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "employee_evaluations_employee_id_idx" ON "employee_evaluations"("employee_id");
ALTER TABLE "employee_evaluations" ADD CONSTRAINT "employee_evaluations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_evaluations" ADD CONSTRAINT "employee_evaluations_evaluated_by_id_fkey" FOREIGN KEY ("evaluated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "administrative_records" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT,
    "employee_name" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "administrative_records_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "administrative_records_employee_id_idx" ON "administrative_records"("employee_id");
ALTER TABLE "administrative_records" ADD CONSTRAINT "administrative_records_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "administrative_records" ADD CONSTRAINT "administrative_records_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
