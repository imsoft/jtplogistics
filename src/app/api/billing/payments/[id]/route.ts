import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit-log";
import { docFolio, failure, requireBilling } from "@/lib/billing-server";

/**
 * DELETE /api/billing/payments/[id] — quita el pago y su movimiento de banco.
 * Si fue parte de una transferencia que pagó varias facturas, se quita la
 * transferencia completa: el banco solo tiene un movimiento por todas.
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireBilling("delete");
    const { id } = await params;
    const p = await prisma.billingPayment.findUnique({ where: { id }, include: { document: true } });
    if (!p) return Response.json({ error: "No encontrado" }, { status: 404 });
    let removed = 1;
    if (p.batchMovementId) {
      removed = await prisma.billingPayment.count({ where: { batchMovementId: p.batchMovementId } });
      // Al borrar el movimiento se borran en cascada los cobros que cuelgan de él.
      await prisma.bankMovement.delete({ where: { id: p.batchMovementId } });
    } else {
      await prisma.billingPayment.delete({ where: { id } });
    }
    void logAudit({
      resource: "billing_document",
      resourceId: p.documentId,
      resourceLabel: `${docFolio(p.document)} · ${p.document.partyName}`,
      action: "updated",
      userId: session.user.id,
      userName: session.user.name,
      changes: [{ field: "payment", label: removed > 1 ? `Transferencia borrada (${removed} facturas)` : "Pago borrado", from: `${p.amount.toFixed(2)} ${p.document.currency}`, to: null }],
    });
    return Response.json({ ok: true, removed });
  } catch (e) {
    return failure(e, "payment DELETE");
  }
}
