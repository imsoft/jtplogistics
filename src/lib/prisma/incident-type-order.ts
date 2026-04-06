import type { Prisma } from "@prisma/client";

/** Orden global de tipos de incidencia (admin: arrastrar). */
export const incidentTypeDefOrderBy: Prisma.IncidentTypeDefOrderByWithRelationInput[] = [
  { sortOrder: "asc" },
  { createdAt: "asc" },
];
