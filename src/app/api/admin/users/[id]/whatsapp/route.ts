import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-server";

// PATCH — actualiza el número de WhatsApp de un usuario carrier
// body: { whatsappPhone: string | null }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

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

    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
