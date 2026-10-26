-- CreateTable
CREATE TABLE "carrier_vehicles" (
    "id" TEXT NOT NULL,
    "carrier_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "label" TEXT,
    "plates" TEXT NOT NULL,
    "year" INTEGER,
    "vehicle_config" TEXT,
    "sct_permit_type" TEXT,
    "sct_permit_number" TEXT,
    "gross_weight_tons" DOUBLE PRECISION,
    "insurer" TEXT,
    "policy_number" TEXT,
    "trailer_subtype" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carrier_vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carrier_operators" (
    "id" TEXT NOT NULL,
    "carrier_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rfc" TEXT,
    "license_number" TEXT,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carrier_operators_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "carrier_vehicles_carrier_id_idx" ON "carrier_vehicles"("carrier_id");

-- CreateIndex
CREATE INDEX "carrier_operators_carrier_id_idx" ON "carrier_operators"("carrier_id");

-- AddForeignKey
ALTER TABLE "carrier_vehicles" ADD CONSTRAINT "carrier_vehicles_carrier_id_fkey" FOREIGN KEY ("carrier_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carrier_operators" ADD CONSTRAINT "carrier_operators_carrier_id_fkey" FOREIGN KEY ("carrier_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

