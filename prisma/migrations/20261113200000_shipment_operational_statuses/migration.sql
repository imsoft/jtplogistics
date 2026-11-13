-- Estados operativos del embarque (en camino), pedidos por el cliente.
ALTER TYPE "ShipmentStatus" ADD VALUE IF NOT EXISTS 'traffic_delay';
ALTER TYPE "ShipmentStatus" ADD VALUE IF NOT EXISTS 'awaiting_entry';
ALTER TYPE "ShipmentStatus" ADD VALUE IF NOT EXISTS 'awaiting_papers';
ALTER TYPE "ShipmentStatus" ADD VALUE IF NOT EXISTS 'meal_stop';
ALTER TYPE "ShipmentStatus" ADD VALUE IF NOT EXISTS 'safe_yard';
ALTER TYPE "ShipmentStatus" ADD VALUE IF NOT EXISTS 'checkpoint';
ALTER TYPE "ShipmentStatus" ADD VALUE IF NOT EXISTS 'awaiting_unload';
ALTER TYPE "ShipmentStatus" ADD VALUE IF NOT EXISTS 'first_delivery';
ALTER TYPE "ShipmentStatus" ADD VALUE IF NOT EXISTS 'at_ramp';
