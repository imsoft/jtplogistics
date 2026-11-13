import { prisma } from "@/lib/db";
import { requireCollaboratorOrAdmin } from "@/lib/auth-server";
import { logAudit } from "@/lib/audit-log";
import { readQuoteProvider } from "@/lib/quote-providers";
import { carrierPrimaryLabel } from "@/lib/carrier-provider-options";

function toJson(p: {
  id: string;
  carrierId: string | null;
  name: string;
  amount: number;
  routeIndex: number | null;
  createdAt: Date;
  createdBy: { name: string } | null;
}) {
  return {
    id: p.id,
    carrierId: p.carrierId,
    name: p.name,
    amount: p.amount,
    routeIndex: p.routeIndex,
    createdByName: p.createdBy?.name ?? null,
    createdAt: p.createdAt.toISOString(),
  };
}

/**
 * GET /api/quote-providers?quoteId= — con qué proveedores se cotizó.
 * Solo el equipo (admin y colaboradores): es nuestro costo, el vendedor externo no lo ve.
 */
export async function GET(request: Request) {
  try {
    await requireCollaboratorOrAdmin();
    const quoteId = new URL(request.url).searchParams.get("quoteId") ?? "";
    const list = await prisma.quoteProvider.findMany({
      where: { quoteId },
      orderBy: { amount: "asc" },
      include: { createdBy: { select: { name: true } } },
    });
    return Response.json(list.map(toJson));
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[quote-providers] GET", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

/** POST /api/quote-providers { quoteId, carrierId? | name, amount, routeIndex? } */
export async function POST(request: Request) {
  try {
    const session = await requireCollaboratorOrAdmin();
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const quoteId = typeof body.quoteId === "string" ? body.quoteId : "";
    const quote = await prisma.generatedQuote.findUnique({ where: { id: quoteId }, select: { id: true, quoteNumber: true, rows: true } });
    if (!quote) return Response.json({ error: "No encontrado" }, { status: 404 });

    const routes = Array.isArray(quote.rows) ? quote.rows.length : 0;
    const data = readQuoteProvider(body, routes);
    if ("error" in data) return Response.json({ error: data.error }, { status: 400 });

    // Si es uno dado de alta, el nombre sale de su perfil (no del que mande el navegador).
    let name = data.name;
    if (data.carrierId) {
      const carrier = await prisma.user.findFirst({
        where: { id: data.carrierId, role: "carrier" },
        include: { profile: { select: { commercialName: true, legalName: true } } },
      });
      if (!carrier) return Response.json({ error: "Ese proveedor no está dado de alta." }, { status: 400 });
      name = carrierPrimaryLabel(carrier as never);
    }

    const created = await prisma.quoteProvider.create({
      data: { quoteId, carrierId: data.carrierId, name, amount: data.amount, routeIndex: data.routeIndex, createdById: session.user.id },
      include: { createdBy: { select: { name: true } } },
    });

    void logAudit({
      resource: "generated_quote",
      resourceId: quoteId,
      resourceLabel: quote.quoteNumber,
      action: "updated",
      userId: session.user.id,
      userName: session.user.name,
      changes: [{ field: "provider", label: "Proveedor cotizado", from: null, to: `${name}: ${data.amount}` }],
    });

    return Response.json(toJson(created), { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[quote-providers] POST", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
