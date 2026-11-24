import { prisma } from "@/lib/db";
import { adminOrDeveloperHandler } from "@/lib/api-handler";
import { logAudit } from "@/lib/audit-log";
import { WHATSAPP_AUDIT_RESOURCE, setWhatsappAuto, whatsappAutoEnabled } from "@/lib/whatsapp-auto";

/**
 * Envío automático de WhatsApp al cambiar el estado de un embarque.
 * GET: si está prendido y los últimos envíos. PUT { enabled }: prenderlo o apagarlo.
 */
export function GET() {
  return adminOrDeveloperHandler(async () => {
    const recent = await prisma.auditLog.findMany({
      where: { resource: WHATSAPP_AUDIT_RESOURCE },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, resourceLabel: true, changes: true, createdAt: true, userName: true },
    });
    return Response.json({
      enabled: await whatsappAutoEnabled(),
      recent: recent.map((r) => {
        const changes = (r.changes ? JSON.parse(r.changes) : []) as { field: string; to: string | null }[];
        const get = (f: string) => changes.find((c) => c.field === f)?.to ?? null;
        return { id: r.id, label: r.resourceLabel, template: get("template"), to: get("to"), result: get("result"), by: r.userName, at: r.createdAt };
      }),
    });
  });
}

export function PUT(request: Request) {
  return adminOrDeveloperHandler(async (session) => {
    const body = (await request.json().catch(() => ({}))) as { enabled?: unknown };
    if (typeof body.enabled !== "boolean") return Response.json({ error: "Falta enabled." }, { status: 400 });
    const before = await whatsappAutoEnabled();
    await setWhatsappAuto(body.enabled);
    void logAudit({
      resource: "setting",
      resourceId: "whatsapp_auto_status",
      resourceLabel: "WhatsApp automático al cambiar el estado",
      action: "updated",
      userId: session.user.id,
      userName: session.user.name,
      changes: [{ field: "enabled", label: "Activo", from: before ? "Sí" : "No", to: body.enabled ? "Sí" : "No" }],
    });
    return Response.json({ enabled: body.enabled });
  });
}
