/**
 * Difusión del mural: notificación en el dashboard + correo a los colaboradores.
 * Fire-and-forget: los errores se registran pero nunca se propagan.
 */

import { prisma } from "@/lib/db";
import { notify } from "@/lib/notify";
import { sendEmail } from "@/lib/email";

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

function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.BETTER_AUTH_URL ??
    ""
  ).replace(/\/$/, "");
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function muralEmailHtml(options: {
  name: string;
  heading: string;
  paragraphs: string[];
  ctaLabel: string;
  ctaHref: string;
}): string {
  const { name, heading, paragraphs, ctaLabel, ctaHref } = options;
  const body = paragraphs
    .map((p) => `<p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.6;">${p}</p>`)
    .join("\n");

  return `
<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;">
  <p style="color:#6b7280;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;margin:0 0 8px;">Mural JTP Logistics</p>
  <h1 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 16px;">${escapeHtml(heading)}</h1>
  <p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.6;">Hola <strong>${escapeHtml(name)}</strong>,</p>
  ${body}
  ${
    ctaHref
      ? `<p style="margin:24px 0 0;"><a href="${ctaHref}" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;font-size:14px;font-weight:600;">${escapeHtml(ctaLabel)}</a></p>`
      : ""
  }
  <p style="color:#6b7280;font-size:12px;margin-top:28px;">JTP Logistics — Este correo es automático, por favor no respondas directamente.</p>
</div>`.trim();
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
          html: muralEmailHtml({
            name: u.name,
            heading,
            paragraphs,
            ctaLabel,
            ctaHref: href,
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
