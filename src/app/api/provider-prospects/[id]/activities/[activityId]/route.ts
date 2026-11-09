import { prisma } from "@/lib/db";
import { requireProspectAccess } from "@/lib/prospect-auth";

/**
 * DELETE /api/provider-prospects/[id]/activities/[activityId]
 * Para corregir una captura equivocada: la borra quien la escribió o quien
 * puede eliminar en la prospección.
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; activityId: string }> }) {
  try {
    const session = await requireProspectAccess("update");
    const { id, activityId } = await params;
    const activity = await prisma.providerProspectActivity.findFirst({ where: { id: activityId, prospectId: id } });
    if (!activity) return Response.json({ error: "No encontrado" }, { status: 404 });

    if (activity.authorId !== session.user.id) await requireProspectAccess("delete");

    await prisma.providerProspectActivity.delete({ where: { id: activityId } });
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[provider-prospects/:id/activities/:activityId] DELETE", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
