-- País de origen y destino de cada ruta. Todas las existentes son nacionales (México).
ALTER TABLE "routes" ADD COLUMN "origin_country" TEXT NOT NULL DEFAULT 'MX';
ALTER TABLE "routes" ADD COLUMN "destination_country" TEXT NOT NULL DEFAULT 'MX';
