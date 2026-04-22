-- Corregir nombre de ciudad: Tlajomulco → Tlajomulco de Zúñiga
UPDATE "routes"
SET "origin" = 'Tlajomulco de Zúñiga'
WHERE lower("origin") = 'tlajomulco';

UPDATE "routes"
SET "destination" = 'Tlajomulco de Zúñiga',
    "destination_state" = 'Jalisco'
WHERE lower("destination") = 'tlajomulco';

-- Corregir nombre de ciudad: Tehuacan → Tehuacán
UPDATE "routes"
SET "origin" = 'Tehuacán'
WHERE lower("origin") = 'tehuacan';

UPDATE "routes"
SET "destination" = 'Tehuacán',
    "destination_state" = 'Puebla'
WHERE lower("destination") = 'tehuacan';
