import { prisma } from "@/lib/db";
import { requireModuleAccess } from "@/lib/module-access";
import { providerNameKey as nameKey } from "@/lib/provider-onboardings";

/**
 * GET /api/provider-onboardings/pending-prospects — prospectos que ya van
 * "En proceso de alta" o "Listo para operar" pero todavía no tienen su alta.
 * Va con el permiso de altas (no el de prospección): es quien tiene que
 * abrir el expediente el que necesita verlos.
 */
export async function GET() {
  try {
    await requireModuleAccess("ProviderOnboardings", "view");
    const [prospects, onboardings] = await Promise.all([
      prisma.providerProspect.findMany({
        where: { status: { in: ["en_alta", "listo"] }, onboarding: null },
        orderBy: { updatedAt: "desc" },
        select: { id: true, commercialName: true, legalName: true, createdBy: { select: { name: true } } },
      }),
      prisma.providerOnboarding.findMany({ select: { commercialName: true, legalName: true } }),
    ]);
    // Muchas altas se abrieron a mano sin ligarlas al prospecto: si ya hay una
    // con el mismo nombre, ese proveedor ya tiene su alta y no se avisa.
    const existing = new Set(onboardings.flatMap((o) => [nameKey(o.commercialName), nameKey(o.legalName)]).filter(Boolean));
    const pending = prospects.filter((p) => !existing.has(nameKey(p.commercialName)) && !existing.has(nameKey(p.legalName)));
    return Response.json(
      pending.map((p) => ({ id: p.id, commercialName: p.commercialName, legalName: p.legalName, createdByName: p.createdBy?.name ?? null }))
    );
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[provider-onboardings] pending-prospects", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
