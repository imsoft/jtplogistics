import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { gateProviders } from "@/lib/provider-auth";
import { logAudit } from "@/lib/audit-log";

/** Largo máximo de la condición: es una celda de la tabla del tarifario. */
const MAX_TERMS_LENGTH = 300;

/**
 * PATCH /api/admin/carrier-routes/[id]/terms
 * body: { terms: string | null }
 *
 * Condición pactada con el proveedor para esa ruta. La captura JTP (pricing),
 * nunca el transportista, y es la quinta columna del tarifario.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session } = await gateProviders("canUpdateProviders");
    const { id } = await params;
    const body = await request.json() as { terms?: unknown };

    if (body.terms !== null && typeof body.terms !== "string") {
      return Response.json({ error: "terms debe ser texto o null" }, { status: 400 });
    }
    const terms = typeof body.terms === "string" ? body.terms.trim() : null;
    if (terms && terms.length > MAX_TERMS_LENGTH) {
      return Response.json(
        { error: `La condición no puede pasar de ${MAX_TERMS_LENGTH} caracteres.` },
        { status: 400 }
      );
    }

    const carrierRoute = await prisma.carrierRoute.findUnique({
      where: { id },
      include: {
        carrier: { select: { name: true } },
        route: { select: { origin: true, destination: true } },
      },
    });
    if (!carrierRoute) {
      return Response.json({ error: "Ruta no encontrada" }, { status: 404 });
    }

    const updated = await prisma.carrierRoute.update({
      where: { id },
      data: { terms: terms || null },
      select: { terms: true },
    });

    void logAudit({
      resource: "carrier_route",
      resourceId: id,
      resourceLabel: `${carrierRoute.route.origin} → ${carrierRoute.route.destination} (${carrierRoute.carrier.name})`,
      action: "updated",
      userId: session.user.id,
      userName: session.user.name,
      changes: [
        {
          field: "terms",
          label: "Término y condición",
          from: carrierRoute.terms,
          to: updated.terms,
        },
      ],
    });

    return Response.json({ terms: updated.terms });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
