import { adminHandler } from "@/lib/api-handler";
import { sendEmail } from "@/lib/email";
import { logAudit } from "@/lib/audit-log";
import { EMAIL_PREVIEWS, findEmailPreview } from "@/lib/email-previews";

/** Tope por envío: esta pantalla es para revisar plantillas, no para difundir. */
const MAX_PER_REQUEST = 12;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * GET /api/admin/email-demos
 * Catálogo de correos con su vista previa, para pintarlos en la pantalla.
 * `?id=` devuelve además el HTML de esa plantilla.
 */
export function GET(request: Request) {
  return adminHandler(async () => {
    const id = new URL(request.url).searchParams.get("id");

    if (id) {
      const preview = findEmailPreview(id);
      if (!preview) return Response.json({ error: "Plantilla desconocida" }, { status: 404 });
      const built = preview.build();
      return Response.json({
        id: preview.id,
        label: preview.label,
        subject: built.subject,
        html: built.html ?? null,
        text: built.text,
      });
    }

    return Response.json(
      EMAIL_PREVIEWS.map((p) => ({
        id: p.id,
        label: p.label,
        description: p.description,
        group: p.group,
      }))
    );
  });
}

/**
 * POST /api/admin/email-demos
 * body: { to: string, ids: string[] }
 *
 * Manda los correos de ejemplo a la dirección indicada. Solo admin: es el
 * único rol que necesita revisar cómo se ven los correos de toda la plataforma.
 */
export function POST(request: Request) {
  return adminHandler(async (session) => {
    const body = (await request.json()) as { to?: unknown; ids?: unknown };

    const to = typeof body.to === "string" ? body.to.trim() : "";
    if (!EMAIL_RE.test(to)) {
      return Response.json({ error: "Escribe un correo válido." }, { status: 400 });
    }

    if (!Array.isArray(body.ids) || body.ids.length === 0) {
      return Response.json({ error: "Elige al menos un correo." }, { status: 400 });
    }
    if (body.ids.length > MAX_PER_REQUEST) {
      return Response.json(
        { error: `No se pueden mandar más de ${MAX_PER_REQUEST} correos de una vez.` },
        { status: 400 }
      );
    }

    const previews = body.ids.map((id) => (typeof id === "string" ? findEmailPreview(id) : undefined));
    if (previews.some((p) => !p)) {
      return Response.json({ error: "Alguna plantilla no existe." }, { status: 400 });
    }

    // El resultado se reporta plantilla por plantilla: si el dominio no está
    // verificado en Resend, aquí es donde el admin ve el motivo exacto.
    const results = await Promise.all(
      previews.map(async (preview) => {
        const p = preview!;
        try {
          const built = p.build();
          await sendEmail({
            to,
            subject: `[DEMO] ${built.subject}`,
            html: built.html || undefined,
            text: built.text,
          });
          return { id: p.id, label: p.label, ok: true as const };
        } catch (e) {
          return {
            id: p.id,
            label: p.label,
            ok: false as const,
            error: e instanceof Error ? e.message : "Error desconocido",
          };
        }
      })
    );

    const sent = results.filter((r) => r.ok).length;

    void logAudit({
      resource: "email_demo",
      resourceId: to,
      resourceLabel: `${sent}/${results.length} correos de ejemplo a ${to}`,
      action: "created",
      userId: session.user.id,
      userName: session.user.name,
    });

    return Response.json({ sent, total: results.length, results });
  });
}
