-- ============================================================
-- Normalizar nombres de hubs y ciudades abreviadas
-- ============================================================

-- Origen
UPDATE "routes" SET "origin" = 'Mexicali'                  WHERE lower("origin") = 'hub mexicali';
UPDATE "routes" SET "origin" = 'Villahermosa'              WHERE lower("origin") = 'hub villahermosa';
UPDATE "routes" SET "origin" = 'Monterrey'                 WHERE lower("origin") = 'pb hub monterrey';
UPDATE "routes" SET "origin" = 'Hidalgo'                   WHERE lower("origin") = 'cd. hidalgo';
UPDATE "routes" SET "origin" = 'Poza Rica de Hidalgo'      WHERE lower("origin") = 'poza rica';
UPDATE "routes" SET "origin" = 'Los Mochis'                WHERE lower("origin") = 'los mochis';
UPDATE "routes" SET "origin" = 'Santa Isabel Xiloxoxtla'   WHERE lower("origin") = 'sta. isabel xi.,tlax';
UPDATE "routes" SET "origin" = 'San Cristóbal de las Casas' WHERE lower("origin") = 's. cristobal c.';
UPDATE "routes" SET "origin" = 'Soledad de Doblado'        WHERE lower("origin") = 'soledad doblado';
UPDATE "routes" SET "origin" = 'Tehuetlán'                 WHERE lower("origin") = 'tehuatlan';

-- Destino + estado
UPDATE "routes" SET "destination" = 'Mexicali',                  "destination_state" = 'Baja California' WHERE lower("destination") = 'hub mexicali';
UPDATE "routes" SET "destination" = 'Villahermosa',              "destination_state" = 'Tabasco'         WHERE lower("destination") = 'hub villahermosa';
UPDATE "routes" SET "destination" = 'Monterrey',                 "destination_state" = 'Nuevo León'      WHERE lower("destination") = 'pb hub monterrey';
UPDATE "routes" SET "destination" = 'Hidalgo',                   "destination_state" = 'Michoacán'       WHERE lower("destination") = 'cd. hidalgo';
UPDATE "routes" SET "destination" = 'Poza Rica de Hidalgo',      "destination_state" = 'Veracruz'        WHERE lower("destination") = 'poza rica';
UPDATE "routes" SET "destination" = 'Los Mochis',                "destination_state" = 'Sinaloa'         WHERE lower("destination") = 'los mochis';
UPDATE "routes" SET "destination" = 'Santa Isabel Xiloxoxtla',   "destination_state" = 'Tlaxcala'        WHERE lower("destination") = 'sta. isabel xi.,tlax';
UPDATE "routes" SET "destination" = 'San Cristóbal de las Casas',"destination_state" = 'Chiapas'         WHERE lower("destination") = 's. cristobal c.';
UPDATE "routes" SET "destination" = 'Soledad de Doblado',        "destination_state" = 'Veracruz'        WHERE lower("destination") = 'soledad doblado';
UPDATE "routes" SET "destination" = 'Tehuetlán',                 "destination_state" = 'Hidalgo'         WHERE lower("destination") = 'tehuatlan';
