-- Soporte de TI: mantenimientos de equipo y reportes de los colaboradores.
-- La evidencia (quién, cuándo, qué se hizo y fotos) es lo que pide ISO 9001.

CREATE TYPE "MaintenanceKind" AS ENUM ('preventive', 'corrective');
CREATE TYPE "MaintenanceStatus" AS ENUM ('scheduled', 'done', 'cancelled');
CREATE TYPE "EquipmentKind" AS ENUM ('laptop', 'phone');
CREATE TYPE "TicketStatus" AS ENUM ('open', 'in_progress', 'resolved');

CREATE TABLE "support_tickets" (
  "id"             TEXT NOT NULL,
  "title"          TEXT NOT NULL,
  "description"    TEXT NOT NULL,
  "status"         "TicketStatus" NOT NULL DEFAULT 'open',
  "equipment_kind" "EquipmentKind",
  "laptop_id"      TEXT,
  "phone_id"       TEXT,
  "reporter_id"    TEXT NOT NULL,
  "resolution"     TEXT,
  "resolved_at"    TIMESTAMP(3),
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "maintenances" (
  "id"             TEXT NOT NULL,
  "kind"           "MaintenanceKind" NOT NULL,
  "status"         "MaintenanceStatus" NOT NULL DEFAULT 'scheduled',
  "equipment_kind" "EquipmentKind" NOT NULL,
  "laptop_id"      TEXT,
  "phone_id"       TEXT,
  "description"    TEXT NOT NULL,
  "findings"       TEXT,
  "scheduled_for"  TIMESTAMP(3) NOT NULL,
  "performed_at"   TIMESTAMP(3),
  "photos"         JSONB,
  "technician_id"  TEXT NOT NULL,
  "ticket_id"      TEXT,
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "maintenances_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "support_tickets_status_idx"  ON "support_tickets"("status");
CREATE INDEX "maintenances_scheduled_for_idx" ON "maintenances"("scheduled_for");

ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_laptop_id_fkey"
  FOREIGN KEY ("laptop_id") REFERENCES "laptops"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_phone_id_fkey"
  FOREIGN KEY ("phone_id") REFERENCES "phones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_reporter_id_fkey"
  FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "maintenances" ADD CONSTRAINT "maintenances_laptop_id_fkey"
  FOREIGN KEY ("laptop_id") REFERENCES "laptops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "maintenances" ADD CONSTRAINT "maintenances_phone_id_fkey"
  FOREIGN KEY ("phone_id") REFERENCES "phones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "maintenances" ADD CONSTRAINT "maintenances_technician_id_fkey"
  FOREIGN KEY ("technician_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "maintenances" ADD CONSTRAINT "maintenances_ticket_id_fkey"
  FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
