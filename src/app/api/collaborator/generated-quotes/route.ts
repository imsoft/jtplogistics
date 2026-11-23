import { prisma } from "@/lib/db";
import { requireCollaboratorOrAdmin } from "@/lib/auth-server";
import { parseQuoteScope } from "@/lib/quote-scope";

/** GET ?scope=nacional|internacional — las cotizaciones del colaborador en ese cotizador. */
export async function GET(request: Request) {
  try {
    const session = await requireCollaboratorOrAdmin();

    const quotes = await prisma.generatedQuote.findMany({
      where: { createdById: session.user.id, scope: parseQuoteScope(new URL(request.url).searchParams.get("scope")) },
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
        rejectionReason: true,
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
