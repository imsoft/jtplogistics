import { prisma } from "@/lib/db";
import { notify } from "@/lib/notify";
import { sendEmail } from "@/lib/email";
import { brandedEmail, appUrl, escapeHtml } from "@/lib/email-layout";
import { clientRouteAlertText, type NewClientRoute } from "@/lib/client-route-alerts";

function clientHref(role: string, clientId: string): string {
  return role === "admin" ? `/admin/dashboard/clients/${clientId}` : `/collaborator/dashboard/clients/${clientId}`;
}

/**
 * Avisa (campana y correo) a quien tenga el permiso, menos a quien hizo el
 * cambio. No lanza: un correo que falla no debe tumbar la asignación.
 */
export async function sendClientRouteAlert(
  client: { id: string; name: string },
  routes: NewClientRoute[],
  actor: { id: string; name: string }
): Promise<void> {
  if (routes.length === 0) return;
  try {
    const watchers = await prisma.user.findMany({
      where: { canReceiveClientRouteAlerts: true, offboardedOn: null, id: { not: actor.id }, role: { in: ["admin", "collaborator"] } },
      select: { id: true, name: true, email: true, role: true },
    });
    if (watchers.length === 0) return;
    const { subject, title, body, list } = clientRouteAlertText(client.name, routes, actor.name);
    await notify(watchers.map((w) => ({ userId: w.id, type: "client_route", title, body, href: clientHref(w.role, client.id) })));
    const base = appUrl();
    await Promise.all(
      watchers.map((w) =>
        sendEmail({
          to: w.email,
          subject,
          html: brandedEmail({
            ...(base && { base }),
            eyebrow: "Clientes",
            heading: title,
            paragraphs: [
              `Hola <strong>${escapeHtml(w.name.trim())}</strong>,`,
              `${escapeHtml(actor.name)} le asignó a <strong>${escapeHtml(client.name)}</strong>:`,
              list.map((l) => `• ${escapeHtml(l)}`).join("<br>"),
            ],
            ...(base && { ctaLabel: "Ver cliente", ctaHref: `${base}${clientHref(w.role, client.id)}` }),
          }),
          text: [`Hola ${w.name.trim()},`, "", body, ...(base ? ["", `${base}${clientHref(w.role, client.id)}`] : [])].join("\n"),
        }).catch((e) => console.error("[client-route-alert] correo", w.email, e))
      )
    );
  } catch (e) {
    console.error("[client-route-alert]", e);
  }
}
