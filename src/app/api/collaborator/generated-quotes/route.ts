import { prisma } from "@/lib/db";
import { requireCollaboratorOrAdmin } from "@/lib/auth-server";

export async function GET() {
  try {
    const session = await requireCollaboratorOrAdmin();

    const quotes = await prisma.generatedQuote.findMany({
      where: { createdById: session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        quoteNumber: true,
        company: true,
        contact: true,
        phone: true,
        email: true,
        validUntil: true,
        status: true,
        createdAt: true,
        createdBy: { select: { id: true, name: true } },
      },
    });

    return Response.json(
      quotes.map((q) => ({
        ...q,
        validUntil: q.validUntil.toISOString().split("T")[0],
        createdAt: q.createdAt.toISOString(),
        createdByName: q.createdBy.name,
      }))
    );
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("Error al obtener cotizaciones:", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
