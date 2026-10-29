import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth-server";
import { hasModuleAccess } from "@/lib/module-access";
import { nextEco } from "@/lib/next-eco";

/** GET /api/shipments/next-eco — el siguiente ECO consecutivo para un embarque nuevo. */
export async function GET() {
  try {
    const session = await requireSession();
    if (!(await hasModuleAccess(session.user, "Shipments", "create"))) return Response.json({ error: "Sin permiso" }, { status: 403 });
    // También los de Finanzas: ahí quedan los de embarques ya borrados.
    const [s, f] = await Promise.all([
      prisma.shipment.findMany({ where: { eco: { not: null } }, select: { eco: true } }),
      prisma.finance.findMany({ where: { eco: { not: null } }, select: { eco: true } }),
    ]);
    return Response.json({ eco: nextEco([...s, ...f].map((x) => x.eco)) });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[shipments/next-eco]", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
