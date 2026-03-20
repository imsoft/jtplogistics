import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-server";
import { logAudit } from "@/lib/audit-log";

// PATCH — actualiza el número de WhatsApp de un usuario carrier
// body: { whatsappPhone: string | null }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();

    const { id } = await params;
    const body = await request.json();
    const whatsappPhone =
      body.whatsappPhone != null
        ? String(body.whatsappPhone).trim() || null
        : null;

    await prisma.user.update({
      where: { id },
      data: { whatsappPhone },
    });

    void logAudit({
      resource: "user_setting",
      resourceId: id,
      resourceLabel: "WhatsApp",
      action: "updated",
      userId: session.user.id,
      userName: session.user.name,
    });

    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
