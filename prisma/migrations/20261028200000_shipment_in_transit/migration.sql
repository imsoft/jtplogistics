-- Embarques: nuevo estado "En tránsito", entre pendiente y entregado.
ALTER TYPE "ShipmentStatus" ADD VALUE IF NOT EXISTS 'in_transit' AFTER 'pending';
