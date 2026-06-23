-- CreateTable: calificación manual de transportistas (por razón social)
CREATE TABLE "carrier_manual_ratings" (
    "id" TEXT NOT NULL,
    "legal_name" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "notes" TEXT,
    "rated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carrier_manual_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "carrier_manual_ratings_legal_name_key" ON "carrier_manual_ratings"("legal_name");

-- AddForeignKey
ALTER TABLE "carrier_manual_ratings" ADD CONSTRAINT "carrier_manual_ratings_rated_by_id_fkey" FOREIGN KEY ("rated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
