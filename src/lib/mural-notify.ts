/**
 * Difusión del mural: notificación en el dashboard + correo a los colaboradores.
 * Fire-and-forget: los errores se registran pero nunca se propagan.
 */

import { prisma } from "@/lib/db";
import { notify } from "@/lib/notify";
import { sendEmail } from "@/lib/email";
import { brandedEmail, escapeHtml, appUrl } from "@/lib/email-layout";

export interface MuralAudienceMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

/**
 * Quién ve el mural: los admin (siempre) y los colaboradores con
 * `canViewMural`. Transportistas y vendedores quedan fuera.
 */
export async function getMuralAudience(): Promise<MuralAudienceMember[]> {
  const users = await prisma.user.findMany({
    where: {
      OR: [{ role: "admin" }, { role: "collaborator", canViewMural: true }],
    },
    select: { id: true, name: true, email: true, role: true },
  });
  return users;
}

/** Prefijo del dashboard según el rol, para armar el enlace de cada persona. */
export function dashboardPrefix(role: string): string {
  return role === "admin" ? "/admin" : "/collaborator";
}

export interface MuralBroadcast {
  /** Tipo de notificación (p. ej. "mural_post", "mural_event"). */
  type: string;
  /** Título de la notificación y asunto por defecto del correo. */
  title: string;
  /** Resumen corto. */
  body?: string;
  /** Ruta dentro del dashboard, sin el prefijo de rol. Ej: `/dashboard/mural`. */
  path: string;
  /** Si es false solo se crea la notificación en el dashboard. */
  sendEmail?: boolean;
  /** Asunto del correo (por defecto, `title`). */
  emailSubject?: string;
  /** Encabezado dentro del correo (por defecto, `title`). */
  emailHeading?: string;
  /** Párrafos del cuerpo del correo. */
  emailParagraphs?: string[];
  /** Texto del botón del correo. */
  emailCta?: string;
  /** Usuario que originó el cambio: no se le notifica a sí mismo. */
  excludeUserId?: string;
}

/**
 * Notifica al mural completo: crea la notificación en el dashboard de cada
 * persona y, si `sendEmail` es true, le manda el correo correspondiente.
 */
export async function broadcastMural(input: MuralBroadcast): Promise<void> {
  try {
    const audience = (await getMuralAudience()).filter(
      (u) => u.id !== input.excludeUserId
    );
    if (audience.length === 0) return;

    await notify(
      audience.map((u) => ({
        userId: u.id,
        type: input.type,
        title: input.title,
        body: input.body,
        href: `${dashboardPrefix(u.role)}${input.path}`,
      }))
    );

    if (!input.sendEmail) return;

    const base = appUrl();
    const paragraphs =
      input.emailParagraphs ?? (input.body ? [escapeHtml(input.body)] : []);
    const heading = input.emailHeading ?? input.title;
    const ctaLabel = input.emailCta ?? "Ver en el mural";

    const results = await Promise.allSettled(
      audience.map((u) => {
        const href = base ? `${base}${dashboardPrefix(u.role)}${input.path}` : "";
        return sendEmail({
          to: u.email,
          subject: input.emailSubject ?? input.title,
          html: brandedEmail({
            preheader: input.body,
            eyebrow: "Mural JTP Logistics",
            heading,
            paragraphs: [`Hola <strong>${escapeHtml(u.name)}</strong>,`, ...paragraphs],
            ctaLabel,
            ctaHref: href || undefined,
          }),
          text: [
            `Hola ${u.name},`,
            "",
            heading,
            ...(input.body ? ["", input.body] : []),
            ...(href ? ["", href] : []),
            "",
            "JTP Logistics",
          ].join("\n"),
        });
      })
    );

    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed > 0) {
      console.error(`[mural-notify] ${failed}/${audience.length} correos fallaron`);
    }
  } catch (e) {
    console.error("[mural-notify] Error:", e);
  }
}
