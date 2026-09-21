/**
 * Listado de vendedores para la tabla, compartido por los paneles de
 * dirección y de colaborador. Misma razón que clients-list: cuando la tabla
 * pasó a paginación del lado del servidor, la API del colaborador se quedó
 * devolviendo una lista simple y la pantalla tronaba.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

const VENDOR_SEARCH_FIELDS = ["name", "position", "email"] as const;
const VENDOR_SORTABLE_FIELDS = new Set(["name", "position", "email", "createdAt"]);

/** Una página de vendedores en la forma que espera useServerTable. */
export async function listVendorsPage(searchParams: URLSearchParams) {
  const all = searchParams.get("all") === "1";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(200, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10) || 20));
  const q = (searchParams.get("q") ?? "").trim();
  const sortBy = searchParams.get("sortBy") ?? "createdAt";
  const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";

  const where: Prisma.UserWhereInput = { role: "vendor" };
  if (q) {
    where.OR = VENDOR_SEARCH_FIELDS.map((field) => ({
      [field]: { contains: q, mode: "insensitive" as Prisma.QueryMode },
    })) as Prisma.UserWhereInput[];
  }

  const orderBy: Prisma.UserOrderByWithRelationInput = VENDOR_SORTABLE_FIELDS.has(sortBy)
    ? ({ [sortBy]: sortDir } as Prisma.UserOrderByWithRelationInput)
    : { createdAt: "desc" };

  const [total, vendors] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy,
      ...(all ? {} : { skip: (page - 1) * pageSize, take: pageSize }),
    }),
  ]);

  return {
    data: vendors.map((u) => ({
      id: u.id,
      name: u.name,
      position: u.position,
      email: u.email,
      image: u.image,
      birthDate: u.birthDate ? u.birthDate.toISOString().split("T")[0] : null,
      createdAt: u.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
  };
}
