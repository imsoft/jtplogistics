import { prisma } from "@/lib/db";
import { requireModuleAccess } from "@/lib/module-access";
import { LEADS_MODULE } from "@/lib/client-leads-server";

/**
 * DELETE /api/client-leads/[id]/activities/[activityId]
 * Para corregir una captura equivocada: la borra quien la escribió o quien
 * puede eliminar en el CRM.
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; activityId: string }> }) {
  try {
    const session = await requireModuleAccess(LEADS_MODULE, "update");
    const { id, activityId } = await params;
    const activity = await prisma.clientLeadActivity.findFirst({ where: { id: activityId, leadId: id } });
    if (!activity) return Response.json({ error: "No encontrado" }, { status: 404 });

    if (activity.authorId !== session.user.id) {
      await requireModuleAccess(LEADS_MODULE, "delete");
    }

    await prisma.clientLeadActivity.delete({ where: { id: activityId } });
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[client-leads/:id/activities/:activityId] DELETE", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
