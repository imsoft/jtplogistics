import { adminOrDeveloperHandler } from "@/lib/api-handler";
import { logAudit } from "@/lib/audit-log";
import { WHATSAPP_TEMPLATES, templateCreateBody } from "@/lib/whatsapp-templates";
import { WhatsAppError, createWhatsAppTemplate, listWhatsAppTemplates, whatsappConfig } from "@/lib/whatsapp-server";

/**
 * Página de pruebas de WhatsApp (dirección y soporte de TI).
 * GET: si está configurado y el estado de las plantillas en Meta.
 * POST { action: "register-templates" }: manda a revisión las plantillas de JTP que falten.
 */
export function GET() {
  return adminOrDeveloperHandler(async () => {
    const cfg = whatsappConfig();
    const base = {
      configured: cfg.missing.length === 0,
      missing: cfg.missing,
      phoneNumberId: cfg.phoneNumberId,
      businessAccountId: cfg.businessAccountId,
    };
    if (!base.configured) return Response.json({ ...base, templates: [] });
    try {
      return Response.json({ ...base, templates: await listWhatsAppTemplates() });
    } catch (e) {
      if (e instanceof WhatsAppError) return Response.json({ ...base, templates: [], templatesError: e.message });
      throw e;
    }
  });
}

export function POST(request: Request) {
  return adminOrDeveloperHandler(async (session) => {
    const body = (await request.json().catch(() => ({}))) as { action?: string };
    if (body.action !== "register-templates") return Response.json({ error: "Acción no válida." }, { status: 400 });
    try {
      const existing = new Set((await listWhatsAppTemplates()).map((t) => `${t.name}|${t.language}`));
      const results: { name: string; result: string }[] = [];
      for (const t of WHATSAPP_TEMPLATES.filter((x) => !x.builtIn)) {
        if (existing.has(`${t.name}|${t.language}`)) {
          results.push({ name: t.name, result: "Ya estaba registrada" });
          continue;
        }
        try {
          const r = await createWhatsAppTemplate(templateCreateBody(t));
          results.push({ name: t.name, result: `Enviada a revisión (${r.status})` });
        } catch (e) {
          results.push({ name: t.name, result: e instanceof Error ? e.message : "No se pudo registrar" });
        }
      }
      void logAudit({
        resource: "settings",
        resourceId: "whatsapp",
        resourceLabel: "Plantillas de WhatsApp",
        action: "updated",
        userId: session.user.id,
        userName: session.user.name,
      });
      return Response.json({ results });
    } catch (e) {
      if (e instanceof WhatsAppError) return Response.json({ error: e.message }, { status: e.status });
      throw e;
    }
  });
}
