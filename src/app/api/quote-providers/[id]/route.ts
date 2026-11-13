import { prisma } from "@/lib/db";
import { requireCollaboratorOrAdmin } from "@/lib/auth-server";
import { logAudit } from "@/lib/audit-log";

/** DELETE /api/quote-providers/[id] — quita un proveedor de la cotización. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCollaboratorOrAdmin();
    const { id } = await params;
    const row = await prisma.quoteProvider.findUnique({ where: { id }, include: { quote: { select: { quoteNumber: true } } } });
    if (!row) return Response.json({ error: "No encontrado" }, { status: 404 });
    await prisma.quoteProvider.delete({ where: { id } });
    void logAudit({
      resource: "generated_quote",
      resourceId: row.quoteId,
      resourceLabel: row.quote.quoteNumber,
      action: "updated",
      userId: session.user.id,
      userName: session.user.name,
      changes: [{ field: "provider", label: "Proveedor cotizado", from: `${row.name}: ${row.amount}`, to: null }],
    });
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[quote-providers/:id] DELETE", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
