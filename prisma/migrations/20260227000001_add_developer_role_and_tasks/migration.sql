-- Agregar valor developer al enum UserRole
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'developer';

-- Crear enum TaskStatus
DO $$ BEGIN
  CREATE TYPE "TaskStatus" AS ENUM ('pending', 'in_progress', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Crear tabla tasks
CREATE TABLE IF NOT EXISTS "tasks" (
  "id"            TEXT NOT NULL,
  "title"         TEXT NOT NULL,
  "description"   TEXT,
  "status"        "TaskStatus" NOT NULL DEFAULT 'pending',
  "assignee_id"   TEXT NOT NULL,
  "created_by_id" TEXT NOT NULL,
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tasks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tasks_assignee_id_fkey"   FOREIGN KEY ("assignee_id")   REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "tasks_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE
);
