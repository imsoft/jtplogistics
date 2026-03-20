import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireCarrier } from "@/lib/auth-server";
import { sendEmail } from "@/lib/email";
import { logAudit } from "@/lib/audit-log";

const PRICING_EMAIL = "pricing@jtp.com.mx";

// GET  — todas las rutas activas + selección guardada del carrier + permiso de edición
export async function GET() {
  try {
    const session = await requireCarrier();

    const [routes, carrierRoutes, userRecord] = await Promise.all([
      prisma.route.findMany({
        where: { status: "active" },
        orderBy: { createdAt: "desc" },
      }),
      prisma.carrierRoute.findMany({
        where: { carrierId: session.user.id },
      }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { canEditTarget: true, canEditRoutes: true },
      }),
    ]);

    const selectionMap = new Map<string, { carrierTarget: number | null; carrierWeeklyVolume: number | null }>(
      carrierRoutes.map((cr) => [
        cr.routeId,
        { carrierTarget: cr.carrierTarget ?? null, carrierWeeklyVolume: cr.carrierWeeklyVolume ?? null },
      ])
    );

    return Response.json({
      canEditTarget: userRecord?.canEditTarget ?? false,
      canEditRoutes: userRecord?.canEditRoutes ?? false,
      routes: routes.map((r) => ({
        id: r.id,
        origin: r.origin,
        destination: r.destination,
        description: r.description ?? null,
        unitType: r.unitType,
        jtpTarget: r.target ?? null,
        selected: selectionMap.has(r.id),
        carrierTarget: selectionMap.get(r.id)?.carrierTarget ?? null,
        carrierWeeklyVolume: selectionMap.get(r.id)?.carrierWeeklyVolume ?? null,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// PUT  — guarda/reemplaza selecciones del carrier
// body: [{ routeId, carrierTarget }]
export async function PUT(request: NextRequest) {
  try {
    const session = await requireCarrier();

    const body: { routeId: string; carrierTarget: number | null; carrierWeeklyVolume: number | null }[] = await request.json();

    if (!Array.isArray(body)) {
      return Response.json({ error: "El cuerpo debe ser un arreglo" }, { status: 400 });
    }

    const userRecord = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { canEditTarget: true, canEditRoutes: true },
    });

    if (userRecord?.canEditRoutes) {
      // Edición completa: reemplaza todo y bloquea
      let data = body;
      if (!userRecord.canEditTarget) {
        const existingRoutes = await prisma.carrierRoute.findMany({
          where: { carrierId: session.user.id },
        });
        const existingTargetMap = new Map(
          existingRoutes.map((r) => [r.routeId, r.carrierTarget ?? null])
        );
        data = body.map((item) => ({
          ...item,
          carrierTarget: existingTargetMap.get(item.routeId) ?? null,
        }));
      }

      await prisma.$transaction([
        prisma.carrierRoute.deleteMany({ where: { carrierId: session.user.id } }),
        prisma.carrierRoute.createMany({
          data: data.map((item) => ({
            carrierId: session.user.id,
            routeId: item.routeId,
            carrierTarget: item.carrierTarget ?? undefined,
            carrierWeeklyVolume: item.carrierWeeklyVolume ?? undefined,
          })),
        }),
        prisma.user.update({
          where: { id: session.user.id },
          data: { canEditRoutes: false },
        }),
      ]);
    } else {
      // Solo agrega rutas nuevas (no toca las existentes)
      const existingRoutes = await prisma.carrierRoute.findMany({
        where: { carrierId: session.user.id },
      });
      const existingRouteIds = new Set(existingRoutes.map((r) => r.routeId));

      const newOnes = body.filter((item) => !existingRouteIds.has(item.routeId));

      if (newOnes.length > 0) {
        const targetData = userRecord?.canEditTarget
          ? newOnes
          : newOnes.map((item) => ({ ...item, carrierTarget: null }));

        await prisma.carrierRoute.createMany({
          data: targetData.map((item) => ({
            carrierId: session.user.id,
            routeId: item.routeId,
            carrierTarget: item.carrierTarget ?? undefined,
            carrierWeeklyVolume: item.carrierWeeklyVolume ?? undefined,
          })),
        });
      }
    }

    // Notificación a pricing
    void notifyPricing(session.user.id, body);

    void logAudit({
      resource: "carrier_routes", resourceId: session.user.id,
      resourceLabel: `Selección de rutas (${body.length})`,
      action: "updated", userId: session.user.id, userName: (session.user as { name: string }).name,
    });

    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

async function notifyPricing(
  carrierId: string,
  items: { routeId: string; carrierTarget: number | null; carrierWeeklyVolume: number | null }[]
) {
  try {
    if (items.length === 0) return;

    const [carrier, routes] = await Promise.all([
      prisma.user.findUnique({
        where: { id: carrierId },
        select: { name: true, email: true },
      }),
      prisma.route.findMany({
        where: { id: { in: items.map((i) => i.routeId) } },
        select: { id: true, origin: true, destination: true },
      }),
    ]);

    const routeMap = new Map(routes.map((r) => [r.id, r]));
    const now = new Date().toLocaleString("es-MX", {
      timeZone: "America/Mexico_City",
      dateStyle: "short",
      timeStyle: "short",
    });

    const lineas = items
      .map((item) => {
        const r = routeMap.get(item.routeId);
        if (!r) return null;
        const target = item.carrierTarget != null
          ? `$${item.carrierTarget.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`
          : "Sin target";
        const vol = item.carrierWeeklyVolume != null ? `${item.carrierWeeklyVolume} unid./sem.` : "—";
        return `• ${r.origin} → ${r.destination} | Target: ${target} | Volumen: ${vol}`;
      })
      .filter(Boolean)
      .join("\n");

    const text = [
      `El proveedor ${carrier?.name ?? "desconocido"} (${carrier?.email ?? ""}) guardó o actualizó su licitación el ${now}.`,
      "",
      `Rutas (${items.length}):`,
      lineas,
    ].join("\n");

    await sendEmail({
      to: PRICING_EMAIL,
      subject: `Licitación actualizada — ${carrier?.name ?? carrierId}`,
      text,
    });
  } catch (e) {
    console.error("[carrier/routes] Error al enviar notificación:", e);
  }
}
