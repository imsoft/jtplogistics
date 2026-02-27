-- CreateTable
CREATE TABLE "carrier_routes" (
    "id" TEXT NOT NULL,
    "carrier_id" TEXT NOT NULL,
    "route_id" TEXT NOT NULL,
    "carrier_target" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carrier_routes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "carrier_routes_carrier_id_route_id_key" ON "carrier_routes"("carrier_id", "route_id");

-- AddForeignKey
ALTER TABLE "carrier_routes" ADD CONSTRAINT "carrier_routes_carrier_id_fkey" FOREIGN KEY ("carrier_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carrier_routes" ADD CONSTRAINT "carrier_routes_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
