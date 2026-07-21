import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireCollaboratorOrAdmin } from "@/lib/auth-server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireCollaboratorOrAdmin();
    const { id } = await params;

    const quote = await prisma.generatedQuote.findUnique({
      where: { id },
      include: { createdBy: { select: { name: true } } },
    });

    if (!quote) {
      return Response.json({ error: "No encontrado" }, { status: 404 });
    }

    if (quote.createdById !== session.user.id) {
      return Response.json({ error: "No autorizado" }, { status: 403 });
    }

    return Response.json({
      ...quote,
      validUntil: quote.validUntil.toISOString().split("T")[0],
      createdAt: quote.createdAt.toISOString(),
      creatorName: quote.createdBy.name,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("Error al obtener cotización:", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
