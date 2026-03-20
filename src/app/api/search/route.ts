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

    // Split query into individual words for multi-term matching
    // and normalize each to strip accents
    const words = q.split(/\s+/).filter((w) => w.length >= 2);
    if (words.length === 0) return Response.json([]);

    // Build a "contains" condition for a field that matches either original or normalized term
    const fieldContains = (field: string, term: string) => {
      const termNorm = normalizeSearch(term);
      const conditions = [{ [field]: { contains: term, mode: "insensitive" as const } }];
      if (termNorm !== term.toLowerCase()) {
        conditions.push({ [field]: { contains: termNorm, mode: "insensitive" as const } });
      }
      return conditions;
    };

    // For a single term: match any of the given fields
    const fieldOr = (fields: string[], term: string) =>
      fields.flatMap((f) => fieldContains(f, term));

    // Each word must match at least one of the given fields (AND of ORs)
    // e.g. "guadalajara queretaro" → word "guadalajara" matches origin OR destination
    //   AND word "queretaro" matches origin OR destination
    const allWordsMatch = (fields: string[]) =>
      words.map((word) => ({ OR: fieldOr(fields, word) }));

    const [routes, carriers, employees, clients, vendors] = await Promise.all([
      // Rutas: each word must match origin OR destination
      prisma.route.findMany({
        where: { AND: allWordsMatch(["origin", "destination"]) },
        take: 15,
        select: { id: true, origin: true, destination: true, status: true },
      }),

      // Transportistas: each word must match name OR email
      prisma.user.findMany({
        where: { role: "carrier", AND: allWordsMatch(["name", "email"]) },
        take: 10,
        select: { id: true, name: true, email: true },
      }),

      // Empleados / colaboradores
      prisma.user.findMany({
        where: {
          role: { in: ["collaborator", "developer"] },
          AND: allWordsMatch(["name", "email"]),
        },
        take: 10,
        select: { id: true, name: true, email: true, role: true },
      }),

      // Clientes: each word must match name, legalName OR email
      prisma.client.findMany({
        where: { AND: allWordsMatch(["name", "legalName", "email"]) },
        take: 10,
        select: { id: true, name: true, email: true },
      }),

      // Vendedores
      prisma.user.findMany({
        where: { role: "vendor", AND: allWordsMatch(["name", "email"]) },
        take: 10,
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
