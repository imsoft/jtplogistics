import { prisma } from "@/lib/db";
import { requireCarrierAccount } from "@/lib/carrier-account";
import { evaluationsFor } from "@/lib/carrier-evaluation-server";

/**
 * GET /api/carrier/evaluations — "Mis evaluaciones": la calificación de JTP y
 * la de cada mes de la empresa del proveedor. Los embarques se ligan por la
 * razón social de su perfil.
 */
export async function GET() {
  try {
    const { carrierId } = await requireCarrierAccount();
    const profile = await prisma.profile.findUnique({ where: { userId: carrierId }, select: { legalName: true } });
    const legalName = profile?.legalName?.trim();
    if (!legalName) return Response.json({ legalName: null, overall: null, months: [] });
    const data = await evaluationsFor(legalName);
    // El proveedor ve el comentario, no quién de JTP lo escribió.
    return Response.json({ ...data, months: data.months.map((m) => ({ ...m, ratedByName: null })) });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[carrier/evaluations] GET", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
