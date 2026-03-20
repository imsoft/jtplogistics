-- Drop the old unique constraint
ALTER TABLE "carrier_routes" DROP CONSTRAINT IF EXISTS "carrier_routes_carrier_id_route_id_key";

-- Add the unit_type column with default empty string
ALTER TABLE "carrier_routes" ADD COLUMN "unit_type" TEXT NOT NULL DEFAULT '';

-- Create new unique constraint including unit_type
ALTER TABLE "carrier_routes" ADD CONSTRAINT "carrier_routes_carrier_id_route_id_unit_type_key" UNIQUE ("carrier_id", "route_id", "unit_type");
