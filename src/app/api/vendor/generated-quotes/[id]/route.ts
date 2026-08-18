import { prisma } from "@/lib/db";
import { requireVendedor } from "@/lib/auth-server";

/**
 * GET /api/vendor/generated-quotes/[id]
 * Detalle de una cotización propia, para volver a descargar su PDF. Si es de
 * otra persona responde 404: el vendedor no tiene por qué saber que existe.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireVendedor();
    const { id } = await params;

    const quote = await prisma.generatedQuote.findFirst({
      where: { id, createdById: session.user.id },
      include: {
        createdBy: {
          select: {
            name: true,
            position: true,
            employeeProfile: { select: { position: true } },
          },
        },
      },
    });
    if (!quote) return Response.json({ error: "No encontrado" }, { status: 404 });

    return Response.json({
      ...quote,
      validUntil: quote.validUntil.toISOString().split("T")[0],
      createdAt: quote.createdAt.toISOString(),
      // Nombre y puesto de quien la creó: van en la zona de firmas del PDF.
      creatorName: quote.createdBy.name,
      creatorPosition:
        quote.createdBy.employeeProfile?.position ?? quote.createdBy.position ?? null,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("Error al obtener la cotización del vendedor:", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
