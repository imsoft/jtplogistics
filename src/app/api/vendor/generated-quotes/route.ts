import { prisma } from "@/lib/db";
import { requireVendedor } from "@/lib/auth-server";

/**
 * GET /api/vendor/generated-quotes
 * Cotizaciones que generó el vendedor en sesión. Nunca las del resto del
 * equipo: cada vendedor ve solo las suyas.
 */
export async function GET() {
  try {
    const session = await requireVendedor();

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
        rows: true,
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
    console.error("Error al obtener cotizaciones del vendedor:", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
