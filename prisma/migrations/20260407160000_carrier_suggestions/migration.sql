-- CreateTable
CREATE TABLE "carrier_suggestions" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "carrier_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carrier_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "carrier_suggestions_carrier_id_idx" ON "carrier_suggestions"("carrier_id");

-- AddForeignKey
ALTER TABLE "carrier_suggestions" ADD CONSTRAINT "carrier_suggestions_carrier_id_fkey" FOREIGN KEY ("carrier_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
