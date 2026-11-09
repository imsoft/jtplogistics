import { prisma } from "@/lib/db";
import { providerNameKey } from "@/lib/provider-onboardings";
import { prospectStatusForOnboarding, type ProspectStatus } from "@/lib/provider-prospects";

/**
 * Prospección y Alta de proveedores muestran a los mismos proveedores: toda
 * alta tiene su prospecto. Si el alta no lo tiene, se liga al prospecto libre
 * con el mismo nombre o se crea uno. Luego el prospecto toma del alta los
 * nombres, el correo (si no tenía) y la etapa (en proceso de alta o listo).
 *
 * No lanza: si algo falla, el alta ya quedó guardada y se reintenta en el
 * siguiente guardado.
 */
export async function syncProspectWithOnboarding(onboardingId: string): Promise<void> {
  try {
    const o = await prisma.providerOnboarding.findUnique({
      where: { id: onboardingId },
      select: {
        id: true,
        legalName: true,
        commercialName: true,
        email: true,
        startedOn: true,
        completedOn: true,
        createdById: true,
        createdAt: true,
        prospect: { select: { id: true, status: true, email: true } },
      },
    });
    if (!o) return;

    let prospect = o.prospect;
    if (!prospect) {
      const keys = new Set([providerNameKey(o.commercialName), providerNameKey(o.legalName)].filter(Boolean));
      const free = await prisma.providerProspect.findMany({
        where: { onboarding: null },
        select: { id: true, status: true, email: true, commercialName: true, legalName: true },
      });
      const match = free.find((p) => keys.has(providerNameKey(p.commercialName)) || keys.has(providerNameKey(p.legalName)));
      prospect =
        match ??
        (await prisma.providerProspect.create({
          data: {
            commercialName: o.commercialName,
            legalName: o.legalName,
            email: o.email,
            contactedOn: o.startedOn,
            status: "en_alta",
            createdById: o.createdById,
            createdAt: o.createdAt,
          },
          select: { id: true, status: true, email: true },
        }));
      await prisma.providerOnboarding.update({ where: { id: o.id }, data: { prospectId: prospect.id } });
    }

    await prisma.providerProspect.update({
      where: { id: prospect.id },
      data: {
        commercialName: o.commercialName,
        legalName: o.legalName,
        ...(!prospect.email && o.email && { email: o.email }),
        status: prospectStatusForOnboarding(prospect.status as ProspectStatus, Boolean(o.completedOn)),
      },
    });
  } catch (e) {
    console.error("[provider-prospect-sync]", onboardingId, e);
  }
}
