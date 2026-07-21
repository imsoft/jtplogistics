import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth-server";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const quote = await prisma.generatedQuote.findUnique({
      where: { id },
      select: { createdById: true },
    });

    if (!quote) {
      return Response.json({ error: "No encontrado" }, { status: 404 });
    }

    if (quote.createdById !== session.user.id) {
      return Response.json({ error: "No autorizado" }, { status: 403 });
    }

    await prisma.generatedQuote.delete({ where: { id } });

    return Response.json({ success: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("Error al eliminar cotización:", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
