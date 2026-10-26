import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit-log";
import { docFolio, failure, requireBilling } from "@/lib/billing-server";
import { removeFile } from "@/lib/billing-attachments-server";

/** DELETE: quita la nota de crédito (y su PDF y XML); la factura recupera el saldo. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireBilling("delete");
    const { id } = await params;
    const note = await prisma.billingCreditNote.findUnique({ where: { id }, include: { document: true, attachments: { select: { storageId: true } } } });
    if (!note) return Response.json({ error: "No encontrado" }, { status: 404 });
    await prisma.billingCreditNote.delete({ where: { id } });
    await Promise.all(note.attachments.map((a) => removeFile(a.storageId)));
    void logAudit({
      resource: "billing_document",
      resourceId: note.documentId,
      resourceLabel: `${docFolio(note.document)} · ${note.document.partyName}`,
      action: "updated",
      userId: session.user.id,
      userName: session.user.name,
      changes: [{ field: "credit_note", label: "Nota de crédito borrada", from: `${note.total.toFixed(2)} ${note.document.currency}`, to: null }],
    });
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e, "credit note DELETE");
  }
}
