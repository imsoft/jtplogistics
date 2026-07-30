-- Contadores de rate limiting de Better Auth, persistentes entre instancias.
CREATE TABLE "rate_limits" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "count" INTEGER NOT NULL,
  "last_request" BIGINT NOT NULL,
  CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "rate_limits_key_key" ON "rate_limits"("key");
