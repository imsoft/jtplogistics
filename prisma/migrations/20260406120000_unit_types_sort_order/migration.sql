-- Orden personalizable de tipos de unidad (admin: drag and drop).

ALTER TABLE "unit_types" ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;

UPDATE "unit_types" AS u
SET "sort_order" = sub.rn
FROM (
  SELECT id, (ROW_NUMBER() OVER (ORDER BY "created_at" ASC) - 1)::integer AS rn
  FROM "unit_types"
) AS sub
WHERE u.id = sub.id;
