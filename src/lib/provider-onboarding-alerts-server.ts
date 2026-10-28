import { prisma } from "@/lib/db";
import { notify } from "@/lib/notify";
import { sendEmail } from "@/lib/email";
import { brandedEmail, appUrl, escapeHtml } from "@/lib/email-layout";
import { providerNameKey } from "@/lib/provider-onboardings";
import { onboardingAlertHref, onboardingAlertText, type OnboardingAlert } from "@/lib/provider-onboarding-alerts";

/**
 * Manda el aviso a quien tenga el permiso de recibirlos, menos a quien hizo
 * el cambio. No lanza: un correo que falla no debe tumbar la operación.
 */
export async function sendOnboardingAlert(alert: OnboardingAlert, actor: { id: string; name: string }): Promise<void> {
  try {
    const watchers = await prisma.user.findMany({
      where: { canReceiveOnboardingAlerts: true, offboardedOn: null, id: { not: actor.id }, role: { in: ["admin", "collaborator"] } },
      select: { id: true, name: true, email: true, role: true },
    });
    if (watchers.length === 0) return;
    const { subject, title, body } = onboardingAlertText(alert, actor.name);
    await notify(watchers.map((w) => ({ userId: w.id, type: "provider_onboarding", title, body, href: onboardingAlertHref(w.role, alert) })));
    const base = appUrl();
    await Promise.all(
      watchers.map((w) =>
        sendEmail({
          to: w.email,
          subject,
          html: brandedEmail({
            ...(base && { base }),
            eyebrow: "Alta de proveedores",
            heading: title,
            paragraphs: [`Hola <strong>${escapeHtml(w.name.trim())}</strong>,`, escapeHtml(body)],
            ...(base && { ctaLabel: "Abrir en la plataforma", ctaHref: `${base}${onboardingAlertHref(w.role, alert)}` }),
          }),
          text: [`Hola ${w.name.trim()},`, "", body, ...(base ? ["", `${base}${onboardingAlertHref(w.role, alert)}`] : [])].join("\n"),
        }).catch((e) => console.error("[onboarding-alert] correo", w.email, e))
      )
    );
  } catch (e) {
    console.error("[onboarding-alert]", e);
  }
}

const READY = ["en_alta", "listo"];

/**
 * Avisa que un prospecto quedó listo para abrir su alta, si entró a esa etapa
 * ahora y todavía no tiene alta (ligada o con el mismo nombre, como el aviso
 * de la pantalla de altas).
 */
export async function alertProspectReady(
  prospect: { id: string; commercialName: string; legalName: string | null; status: string },
  previousStatus: string | null,
  actor: { id: string; name: string }
): Promise<void> {
  if (!READY.includes(prospect.status) || (previousStatus && READY.includes(previousStatus))) return;
  const keys = [providerNameKey(prospect.commercialName), providerNameKey(prospect.legalName)].filter(Boolean);
  const existing = await prisma.providerOnboarding.findMany({ select: { prospectId: true, commercialName: true, legalName: true } });
  const hasAlta = existing.some(
    (o) => o.prospectId === prospect.id || keys.includes(providerNameKey(o.commercialName)) || keys.includes(providerNameKey(o.legalName))
  );
  if (hasAlta) return;
  await sendOnboardingAlert(
    { kind: "prospect_ready", prospectId: prospect.id, name: prospect.commercialName, status: prospect.status as "en_alta" | "listo" },
    actor
  );
}
