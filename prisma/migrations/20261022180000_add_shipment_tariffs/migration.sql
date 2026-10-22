-- Tarifas de venta y compra capturadas en el embarque.
ALTER TABLE "shipments" ADD COLUMN "sale" DOUBLE PRECISION,
ADD COLUMN "cost" DOUBLE PRECISION;
