import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth-server";
import { hasModuleAccess, requireModuleAccess } from "@/lib/module-access";
import { logAudit } from "@/lib/audit-log";

/**
 * Direcciones de carga (origen) y entrega (destino) del cliente, una por
 * ciudad. Las lee quien ve Clientes o quien captura embarques (el formulario
 * de embarque las propone); las edita quien edita Clientes.
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
      orderBy: [{ kind: "asc" }, { city: "asc" }],
      select: { kind: true, city: true, address: true },
    });
    return Response.json(rows);
  } catch (e) {
    return fail(e, "GET");
  }
}

/** PUT { locations: [{ kind, city, address }] } — guarda las que traen dirección y borra las que quedan vacías. */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireModuleAccess("Clients", "update");
    const { id } = await params;
    const client = await prisma.client.findUnique({ where: { id }, select: { name: true } });
    if (!client) return Response.json({ error: "No encontrado" }, { status: 404 });

    const body = (await req.json().catch(() => ({}))) as { locations?: unknown };
    if (!Array.isArray(body.locations)) return Response.json({ error: "Datos inválidos" }, { status: 400 });
    const items = body.locations
      .map((x) => x as Record<string, unknown>)
      .filter((x) => KINDS.includes(x.kind as never) && typeof x.city === "string" && x.city.trim())
      .map((x) => ({
        kind: x.kind as string,
        city: (x.city as string).trim(),
        address: typeof x.address === "string" ? x.address.trim().slice(0, 500) : "",
      }));

    await prisma.$transaction(
      items.map((x) =>
        x.address
          ? prisma.clientLocation.upsert({
              where: { clientId_kind_city: { clientId: id, kind: x.kind, city: x.city } },
              create: { clientId: id, kind: x.kind, city: x.city, address: x.address },
              update: { address: x.address },
            })
          : prisma.clientLocation.deleteMany({ where: { clientId: id, kind: x.kind, city: x.city } })
      )
    );

    void logAudit({
      resource: "client",
      resourceId: id,
      resourceLabel: client.name,
      action: "updated",
      userId: session.user.id,
      userName: session.user.name,
      changes: [{ field: "locations", label: "Direcciones de origen y destino", from: null, to: `${items.filter((x) => x.address).length} capturadas` }],
    });
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e, "PUT");
  }
}
