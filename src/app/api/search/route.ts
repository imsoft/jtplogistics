import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth-server";
import { normalizeSearch } from "@/lib/search";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }

    const { role } = session.user as { role: string };
    if (role !== "admin" && role !== "collaborator") {
      return Response.json({ error: "Prohibido" }, { status: 403 });
    }

    const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (q.length < 2) return Response.json([]);

    // Search with both the original query and the accent-stripped version
    // so "leon" matches "León" and vice versa
    const qNorm = normalizeSearch(q);
    const containsOriginal = { contains: q, mode: "insensitive" as const };
    const containsNorm = { contains: qNorm, mode: "insensitive" as const };
    const fieldOr = (field: string) =>
      qNorm !== q.toLowerCase()
        ? [{ [field]: containsOriginal }, { [field]: containsNorm }]
        : [{ [field]: containsOriginal }];

    const [routes, carriers, employees, clients, vendors] = await Promise.all([
      // Rutas: origen → destino
      prisma.route.findMany({
        where: {
          OR: [...fieldOr("origin"), ...fieldOr("destination")],
        },
        take: 5,
        select: { id: true, origin: true, destination: true, status: true },
      }),

      // Transportistas
      prisma.user.findMany({
        where: { role: "carrier", OR: fieldOr("name") },
        take: 5,
        select: { id: true, name: true, email: true },
      }),

      // Empleados / colaboradores
      prisma.user.findMany({
        where: {
          role: { in: ["collaborator", "developer"] },
          OR: [...fieldOr("name"), ...fieldOr("email")],
        },
        take: 5,
        select: { id: true, name: true, email: true, role: true },
      }),

      // Clientes
      prisma.client.findMany({
        where: {
          OR: [...fieldOr("name"), ...fieldOr("legalName"), ...fieldOr("email")],
        },
        take: 5,
        select: { id: true, name: true, email: true },
      }),

      // Vendedores
      prisma.user.findMany({
        where: { role: "vendor", OR: fieldOr("name") },
        take: 5,
        select: { id: true, name: true, email: true },
      }),
    ]);

    const results = [
      ...routes.map((r) => ({
        type: "route" as const,
        id: r.id,
        label: `${r.origin} → ${r.destination}`,
        sublabel: r.status,
        href: `/admin/dashboard/routes/${r.id}/edit`,
      })),
      ...carriers.map((u) => ({
        type: "carrier" as const,
        id: u.id,
        label: u.name,
        sublabel: u.email ?? "",
        href: `/admin/dashboard/users/${u.id}`,
      })),
      ...employees.map((u) => ({
        type: "employee" as const,
        id: u.id,
        label: u.name,
        sublabel: u.email ?? "",
        href: `/admin/dashboard/employees/${u.id}`,
      })),
      ...clients.map((c) => ({
        type: "client" as const,
        id: c.id,
        label: c.name,
        sublabel: c.email ?? "",
        href: `/admin/dashboard/clients/${c.id}`,
      })),
      ...vendors.map((u) => ({
        type: "vendor" as const,
        id: u.id,
        label: u.name,
        sublabel: u.email ?? "",
        href: `/admin/dashboard/vendors/${u.id}`,
      })),
    ];

    return Response.json(results);
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
