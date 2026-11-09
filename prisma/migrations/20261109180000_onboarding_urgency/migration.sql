-- Alta de proveedores: urgencia del alta (baja, media, alta, urgente).
CREATE TYPE "OnboardingUrgency" AS ENUM ('baja', 'media', 'alta', 'urgente');
ALTER TABLE "provider_onboardings" ADD COLUMN "urgency" "OnboardingUrgency" NOT NULL DEFAULT 'media';
