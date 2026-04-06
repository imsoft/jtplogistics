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
        include: { unitTargets: true },
      }),
      prisma.carrierRoute.findMany({
        where: { carrierId: session.user.id },
      }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { canEditTarget: true, canEditRoutes: true, canAddRoutes: true },
      }),
    ]);

    // Group carrier selections by routeId+unitType
    const selectionKey = (routeId: string, unitType: string) => `${routeId}:${unitType}`;
    const selectionMap = new Map<string, { carrierTarget: number | null; carrierWeeklyVolume: number | null }>(
      carrierRoutes.map((cr) => [
        selectionKey(cr.routeId, cr.unitType),
        { carrierTarget: cr.carrierTarget ?? null, carrierWeeklyVolume: cr.carrierWeeklyVolume ?? null },
      ])
    );

    // Also build a set of all selected route IDs (regardless of unitType) for backward compat
    const selectedRouteIds = new Set(carrierRoutes.map((cr) => cr.routeId));

    // Build per-unitType selection info
    const selectionsByRoute = new Map<string, { unitType: string; carrierTarget: number | null; carrierWeeklyVolume: number | null }[]>();
    for (const cr of carrierRoutes) {
      const list = selectionsByRoute.get(cr.routeId) ?? [];
      list.push({ unitType: cr.unitType, carrierTarget: cr.carrierTarget ?? null, carrierWeeklyVolume: cr.carrierWeeklyVolume ?? null });
      selectionsByRoute.set(cr.routeId, list);
    }

    return Response.json({
      canEditTarget: userRecord?.canEditTarget ?? false,
      canEditRoutes: userRecord?.canEditRoutes ?? false,
      canAddRoutes: userRecord?.canAddRoutes ?? false,
      routes: routes.map((r) => {
        const unitTargets =
          r.unitTargets.length > 0
            ? r.unitTargets.map((u) => ({
                unitType: u.unitType,
                target: u.target,
              }))
            : [{ unitType: r.unitType, target: r.target }];
        return {
          id: r.id,
          origin: r.origin,
          destination: r.destination,
          description: r.description ?? null,
          unitType: r.unitType,
          unitTargets,
          jtpTarget: r.target ?? null,
          selected: selectedRouteIds.has(r.id),
          selections: selectionsByRoute.get(r.id) ?? [],
          carrierTarget: null,
          carrierWeeklyVolume: null,
          createdAt: r.createdAt.toISOString(),
        };
      }),
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

    const body: { routeId: string; unitType: string; carrierTarget: number | null; carrierWeeklyVolume: number | null }[] = await request.json();

    if (!Array.isArray(body)) {
      return Response.json({ error: "El cuerpo debe ser un arreglo" }, { status: 400 });
    }

    // All items should have the same unitType (saving from one page)
    const pageUnitType = request.nextUrl.searchParams.get("unitType") ?? body[0]?.unitType ?? "";

    const userRecord = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { canEditTarget: true, canEditRoutes: true, canAddRoutes: true },
    });

    const existingRoutes = await prisma.carrierRoute.findMany({
      where: { carrierId: session.user.id, unitType: pageUnitType },
    });
    const existingMap = new Map(existingRoutes.map((r) => [`${r.routeId}:${r.unitType}`, r]));
    const incomingMap = new Map(body.map((r) => [`${r.routeId}:${r.unitType}`, r]));
    const newOnes = body.filter((item) => !existingMap.has(`${item.routeId}:${item.unitType}`));
    const removedExisting = existingRoutes.filter((item) => !incomingMap.has(`${item.routeId}:${item.unitType}`));
    const changedExisting = body.filter((item) => {
      const prev = existingMap.get(`${item.routeId}:${item.unitType}`);
      if (!prev) return false;
      return (prev.carrierTarget ?? null) !== (item.carrierTarget ?? null)
        || (prev.carrierWeeklyVolume ?? null) !== (item.carrierWeeklyVolume ?? null);
    });

    if (!userRecord?.canAddRoutes && newOnes.length > 0) {
      return Response.json(
        { error: "No tienes autorización para agregar rutas nuevas. Solicita desbloqueo al administrador." },
        { status: 403 }
      );
    }
    if (!userRecord?.canEditRoutes && (removedExisting.length > 0 || changedExisting.length > 0)) {
      return Response.json(
        { error: "No tienes autorización para editar rutas ya seleccionadas. Solicita desbloqueo al administrador." },
        { status: 403 }
      );
    }

    if (userRecord?.canEditRoutes) {
      // Edición completa: reemplaza selections for this unitType only, preserve others
      let data = body;
      if (!userRecord.canEditTarget) {
        const existingTargetMap = new Map(
          existingRoutes.map((r) => [`${r.routeId}:${r.unitType}`, r.carrierTarget ?? null])
        );
        data = body.map((item) => ({
          ...item,
          carrierTarget: existingTargetMap.get(`${item.routeId}:${item.unitType}`) ?? null,
        }));
      }

      await prisma.$transaction([
        // Only delete selections for this unit type page
        prisma.carrierRoute.deleteMany({
          where: { carrierId: session.user.id, unitType: pageUnitType },
        }),
        prisma.carrierRoute.createMany({
          data: data.map((item) => ({
            carrierId: session.user.id,
            routeId: item.routeId,
            unitType: item.unitType,
            carrierTarget: item.carrierTarget ?? undefined,
            carrierWeeklyVolume: item.carrierWeeklyVolume ?? undefined,
          })),
        }),
      ]);
    } else {
      // Solo agrega rutas nuevas para este unitType (no toca las existentes)
      const existingKeys = new Set(existingRoutes.map((r) => `${r.routeId}:${r.unitType}`));
      const unlockedNewOnes = body.filter((item) => !existingKeys.has(`${item.routeId}:${item.unitType}`));

      if (unlockedNewOnes.length > 0) {
        const targetData = userRecord?.canEditTarget
          ? unlockedNewOnes
          : unlockedNewOnes.map((item) => ({ ...item, carrierTarget: null }));

        await prisma.carrierRoute.createMany({
          data: targetData.map((item) => ({
            carrierId: session.user.id,
            routeId: item.routeId,
            unitType: item.unitType,
            carrierTarget: item.carrierTarget ?? undefined,
            carrierWeeklyVolume: item.carrierWeeklyVolume ?? undefined,
          })),
        });
      }
    }

    // Notificación a pricing
    void notifyPricing(session.user.id, body);

    // After saving, lock both flows so the carrier needs admin authorization:
    // 1) editar existentes, 2) agregar nuevas.
    await prisma.user.update({
      where: { id: session.user.id },
      data: { canEditRoutes: false, canEditTarget: false, canAddRoutes: false },
    });

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
