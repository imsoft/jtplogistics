import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-server";
import { logAudit } from "@/lib/audit-log";

/**
 * POST { orderedIds: string[] } — mismo conjunto que en BD, nuevo orden (índice = sortOrder).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const orderedIds: unknown = body?.orderedIds;
    if (!Array.isArray(orderedIds)) {
      return Response.json({ error: "Se requiere orderedIds (arreglo)" }, { status: 400 });
    }
    const ids = orderedIds.map((id) => String(id)).filter(Boolean);
    const existing = await prisma.incidentTypeDef.findMany({ select: { id: true } });
    const idSet = new Set(existing.map((t) => t.id));
    if (ids.length !== idSet.size || ids.some((id) => !idSet.has(id))) {
      return Response.json(
        { error: "La lista debe incluir exactamente todos los tipos de incidencia, sin duplicados." },
        { status: 400 }
      );
    }

    await prisma.$transaction(
      ids.map((id, index) =>
        prisma.incidentTypeDef.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    );

    void logAudit({
      resource: "incident_type",
      resourceId: "reorder",
      resourceLabel: "Orden de tipos de incidencia",
      action: "updated",
      userId: session.user.id,
      userName: session.user.name,
    });

    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
