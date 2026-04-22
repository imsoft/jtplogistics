-- Corregir nombre de ciudad: Tecamac / TECAMAC → Tecamachalco
UPDATE "routes"
SET "origin" = 'Tecamachalco'
WHERE lower("origin") = 'tecamac';

UPDATE "routes"
SET "destination" = 'Tecamachalco',
    "destination_state" = 'Puebla'
WHERE lower("destination") = 'tecamac';
