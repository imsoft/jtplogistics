import type { Prisma } from "@prisma/client";

/** Orden global de tipos de unidad (admin: drag and drop). */
export const unitTypeDefOrderBy: Prisma.UnitTypeDefOrderByWithRelationInput[] = [
  { sortOrder: "asc" },
  { createdAt: "asc" },
];
