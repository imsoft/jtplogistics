import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth-server";
import { hasModuleAccess, requireModuleAccess } from "@/lib/module-access";
import { logAudit } from "@/lib/audit-log";

/**
 * Direcciones del cliente en pares, por ruta: dónde se carga y dónde se
 * entrega. Las lee quien ve Clientes o quien captura embarques (el formulario
 * de embarque ofrece la de carga y pone sola la de entrega); las edita quien
 * edita Clientes.
 */

function fail(e: unknown, where: string) {
  if (e instanceof Response) return e;
  console.error(`[clients/:id/address-pairs] ${where}`, e);
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
    const rows = await prisma.clientAddressPair.findMany({
      where: { clientId: id },
      orderBy: [{ originAddress: "asc" }, { destinationAddress: "asc" }],
      select: { id: true, routeId: true, originAddress: true, destinationAddress: true, route: { select: { origin: true, destination: true } } },
    });
    // Con origen y destino de la ruta: el embarque los empata por ciudad.
    return Response.json(rows.map(({ route, ...p }) => ({ ...p, origin: route.origin, destination: route.destination })));
  } catch (e) {
    return fail(e, "GET");
  }
}

/**
 * PUT { pairs: [{ routeId, originAddress, destinationAddress }] } — reemplaza
 * todos los pares del cliente. Cada uno va ligado a una ruta suya y necesita
 * las dos direcciones.
 */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireModuleAccess("Clients", "update");
    const { id } = await params;
    const client = await prisma.client.findUnique({ where: { id }, select: { name: true } });
    if (!client) return Response.json({ error: "No encontrado" }, { status: 404 });

    const body = (await req.json().catch(() => ({}))) as { pairs?: unknown };
    if (!Array.isArray(body.pairs)) return Response.json({ error: "Datos inválidos" }, { status: 400 });

    const routeIds = new Set(
      (await prisma.clientRoute.findMany({ where: { clientId: id }, select: { routeId: true } })).map((r) => r.routeId)
    );
    const list = body.pairs.map((x) => x as Record<string, unknown>);
    const text = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, 500) : "");
    // Se reemplaza todo: un par que no cuadra rechaza el guardado en lugar de perderse.
    if (list.some((x) => typeof x.routeId !== "string" || !routeIds.has(x.routeId))) {
      return Response.json({ error: "Alguna dirección no corresponde a una ruta del cliente. Recarga la página e intenta de nuevo." }, { status: 400 });
    }
    if (list.some((x) => !text(x.originAddress) || !text(x.destinationAddress))) {
      return Response.json({ error: "Cada par necesita la dirección de carga y la de entrega." }, { status: 400 });
    }
    const items = list.slice(0, 500).map((x) => ({
      clientId: id,
      routeId: x.routeId as string,
      originAddress: text(x.originAddress),
      destinationAddress: text(x.destinationAddress),
    }));

    await prisma.$transaction([
      prisma.clientAddressPair.deleteMany({ where: { clientId: id } }),
      prisma.clientAddressPair.createMany({ data: items }),
    ]);

    void logAudit({
      resource: "client",
      resourceId: id,
      resourceLabel: client.name,
      action: "updated",
      userId: session.user.id,
      userName: session.user.name,
      changes: [{ field: "addressPairs", label: "Direcciones de carga y entrega", from: null, to: `${items.length} pares` }],
    });
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e, "PUT");
  }
}
