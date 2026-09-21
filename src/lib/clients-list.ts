/**
 * Listado de clientes para la tabla, compartido por los paneles de dirección y
 * de colaborador.
 *
 * Antes cada panel tenía su propia copia de esta consulta. Cuando la tabla
 * pasó a paginación del lado del servidor, se actualizó la de dirección y la
 * de colaborador se quedó devolviendo una lista simple: la tabla buscaba
 * `data`, no la encontraba y la pantalla tronaba. Con una sola función, los
 * dos paneles no pueden volver a desincronizarse.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

const SEARCH_FIELDS = [
  "name", "contactName", "position", "legalName", "rfc", "email", "phone",
] as const;

const SORTABLE_FIELDS = new Set([
  "name", "contactName", "position", "legalName", "email", "phone", "createdAt",
]);

export function clientToJson(c: {
  id: string;
  name: string;
  contactName?: string | null;
  position?: string | null;
  legalName: string | null;
  rfc: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  detentionConditions: string | null;
  productTypes: string[];
  createdAt: Date;
}) {
  return {
    id: c.id,
    name: c.name,
    contactName: c.contactName ?? null,
    position: c.position ?? null,
    legalName: c.legalName,
    rfc: c.rfc,
    email: c.email,
    phone: c.phone,
    address: c.address,
    notes: c.notes,
    detentionConditions: c.detentionConditions,
    productTypes: c.productTypes ?? [],
    createdAt: c.createdAt.toISOString(),
  };
}

/**
 * Una página de clientes con búsqueda y orden, en la forma que espera
 * useServerTable: `{ data, total, page, pageSize }`. Con `all=1` devuelve
 * todos, para quien necesite la lista completa (por ejemplo, un selector).
 */
export async function listClientsPage(searchParams: URLSearchParams) {
  const all = searchParams.get("all") === "1";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(200, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10) || 20));
  const q = (searchParams.get("q") ?? "").trim();
  const sortBy = searchParams.get("sortBy") ?? "createdAt";
  const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";

  const where: Prisma.ClientWhereInput = {};
  if (q) {
    where.OR = SEARCH_FIELDS.map((field) => ({
      [field]: { contains: q, mode: "insensitive" as Prisma.QueryMode },
    })) as Prisma.ClientWhereInput[];
  }

  const orderBy: Prisma.ClientOrderByWithRelationInput = SORTABLE_FIELDS.has(sortBy)
    ? ({ [sortBy]: sortDir } as Prisma.ClientOrderByWithRelationInput)
    : { createdAt: "desc" };

  const [total, clients] = await Promise.all([
    prisma.client.count({ where }),
    prisma.client.findMany({
      where,
      orderBy,
      ...(all ? {} : { skip: (page - 1) * pageSize, take: pageSize }),
    }),
  ]);

  return { data: clients.map(clientToJson), total, page, pageSize };
}
