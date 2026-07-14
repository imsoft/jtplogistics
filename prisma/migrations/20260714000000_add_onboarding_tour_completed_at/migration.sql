-- AlterTable: el tour de bienvenida se marca como visto por usuario (antes vivía en localStorage)
ALTER TABLE "users"
  ADD COLUMN "onboarding_tour_completed_at" TIMESTAMP(3);
