import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth-server";
import { hasModuleAccess, requireModuleAccess } from "@/lib/module-access";
import { logAudit } from "@/lib/audit-log";

/**
 * Direcciones de carga (origen) y entrega (destino) del cliente, por ruta y
 * varias por ciudad. Las lee quien ve Clientes o quien captura embarques (el
 * formulario de embarque las ofrece); las edita quien edita Clientes.
 */

const KINDS = ["origin", "destination"] as const;

function fail(e: unknown, where: string) {
  if (e instanceof Response) return e;
  console.error(`[clients/:id/locations] ${where}`, e);
  return Response.json({ error: "Error interno del servidor" }, { status: 500 });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const allowed =
      (await hasModuleAccess(session.user, "Clients", "view")) ||
      (await hasModuleAccess(session.user, "Shipments", "create")) ||
      (await hasModuleAccess(session.user, "Shipments", "update"));
    if (!allowed) return Response.json({ error: "Sin permiso" }, { status: 403 });
    const { id } = await params;
    const rows = await prisma.clientLocation.findMany({
      where: { clientId: id },
      orderBy: [{ kind: "asc" }, { address: "asc" }],
      select: { id: true, routeId: true, kind: true, city: true, address: true },
    });
    return Response.json(rows);
  } catch (e) {
    return fail(e, "GET");
  }
}

/**
 * PUT { locations: [{ routeId, kind, address }] } — reemplaza todas las
 * direcciones del cliente. Cada una va ligada a una ruta suya; la ciudad se
 * toma de la ruta (origen o destino).
 */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireModuleAccess("Clients", "update");
    const { id } = await params;
    const client = await prisma.client.findUnique({ where: { id }, select: { name: true } });
    if (!client) return Response.json({ error: "No encontrado" }, { status: 404 });

    const body = (await req.json().catch(() => ({}))) as { locations?: unknown };
    if (!Array.isArray(body.locations)) return Response.json({ error: "Datos inválidos" }, { status: 400 });

    const routes = await prisma.route.findMany({
      where: { clientRoutes: { some: { clientId: id } } },
      select: { id: true, origin: true, destination: true },
    });
    const byId = new Map(routes.map((r) => [r.id, r]));
    const list = body.locations.map((x) => x as Record<string, unknown>);
    // Se reemplaza todo: una fila que no cuadra rechaza el guardado en lugar de perderse.
    if (list.some((x) => !KINDS.includes(x.kind as never) || typeof x.routeId !== "string" || !byId.has(x.routeId) || typeof x.address !== "string")) {
      return Response.json({ error: "Alguna dirección no corresponde a una ruta del cliente. Recarga la página e intenta de nuevo." }, { status: 400 });
    }
    const items = list
      .filter((x) => (x.address as string).trim())
      .slice(0, 500)
      .map((x) => {
        const route = byId.get(x.routeId as string)!;
        return {
          clientId: id,
          routeId: route.id,
          kind: x.kind as string,
          city: x.kind === "origin" ? route.origin : route.destination,
          address: (x.address as string).trim().slice(0, 500),
        };
      });

    await prisma.$transaction([
      prisma.clientLocation.deleteMany({ where: { clientId: id } }),
      prisma.clientLocation.createMany({ data: items }),
    ]);

    void logAudit({
      resource: "client",
      resourceId: id,
      resourceLabel: client.name,
      action: "updated",
      userId: session.user.id,
      userName: session.user.name,
      changes: [{ field: "locations", label: "Direcciones de origen y destino", from: null, to: `${items.length} capturadas` }],
    });
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e, "PUT");
  }
}
