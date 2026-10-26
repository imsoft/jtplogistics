import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit-log";
import { r2, SETTLED_TOLERANCE } from "@/lib/billing";
import { DOC_INCLUDE, documentToJson, failure, readDocumentBody, requireBilling } from "@/lib/billing-server";

const label = (d: { series: string | null; folio: string; partyName: string }) =>
  `${[d.series, d.folio].filter(Boolean).join("-")} · ${d.partyName}`;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireBilling("view");
    const { id } = await params;
    const doc = await prisma.billingDocument.findUnique({ where: { id }, include: DOC_INCLUDE });
    if (!doc) return Response.json({ error: "No encontrado" }, { status: 404 });
    return Response.json(documentToJson(doc));
  } catch (e) {
    return failure(e, "document GET");
  }
}

/**
 * PATCH /api/billing/documents/[id]
 * - { cancel: true, cancelReason }: cancela (no se borra: queda el registro).
 * - { reactivate: true }: deshace la cancelación.
 * - Cualquier otro cuerpo: edita la factura completa.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireBilling("update");
    const { id } = await params;
    const doc = await prisma.billingDocument.findUnique({ where: { id }, include: { payments: { select: { amount: true } } } });
    if (!doc) return Response.json({ error: "No encontrado" }, { status: 404 });
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const paid = r2(doc.payments.reduce((s, p) => s + p.amount, 0));

    if (body.cancel === true) {
      const reason = typeof body.cancelReason === "string" ? body.cancelReason.trim() : "";
      if (reason.length < 3) return Response.json({ error: "Escribe por qué se cancela." }, { status: 400 });
      if (paid > SETTLED_TOLERANCE) {
        return Response.json({ error: "Tiene pagos registrados: bórralos antes de cancelar la factura." }, { status: 400 });
      }
      await prisma.billingDocument.update({ where: { id }, data: { cancelledAt: new Date(), cancelReason: reason } });
      void logAudit({ resource: "billing_document", resourceId: id, resourceLabel: label(doc), action: "updated", userId: session.user.id, userName: session.user.name, changes: [{ field: "cancel", label: "Cancelada", from: null, to: reason }] });
      return Response.json({ ok: true });
    }
    if (body.reactivate === true) {
      await prisma.billingDocument.update({ where: { id }, data: { cancelledAt: null, cancelReason: null } });
      void logAudit({ resource: "billing_document", resourceId: id, resourceLabel: label(doc), action: "updated", userId: session.user.id, userName: session.user.name, changes: [{ field: "cancel", label: "Cancelada", from: "sí", to: "no" }] });
      return Response.json({ ok: true });
    }

    const parsed = readDocumentBody(body);
    if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
    if (parsed.data.total < paid - SETTLED_TOLERANCE) {
      return Response.json({ error: `El total no puede quedar por debajo de lo ya pagado (${paid.toFixed(2)}).` }, { status: 400 });
    }
    if (paid > SETTLED_TOLERANCE && parsed.data.currency !== doc.currency) {
      return Response.json({ error: "Ya tiene pagos: no se puede cambiar la moneda." }, { status: 400 });
    }
    const data = { ...parsed.data, ...(doc.kind === "payable" && { clientId: null }) };
    const updated = await prisma.billingDocument.update({ where: { id }, data, include: DOC_INCLUDE });
    void logAudit({ resource: "billing_document", resourceId: id, resourceLabel: label(updated), action: "updated", userId: session.user.id, userName: session.user.name });
    return Response.json(documentToJson(updated));
  } catch (e) {
    return failure(e, "document PATCH");
  }
}

/** DELETE: solo sin pagos. Para dejar constancia, mejor cancelar. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireBilling("delete");
    const { id } = await params;
    const doc = await prisma.billingDocument.findUnique({ where: { id }, include: { _count: { select: { payments: true } } } });
    if (!doc) return Response.json({ error: "No encontrado" }, { status: 404 });
    if (doc._count.payments > 0) {
      return Response.json({ error: "Tiene pagos registrados: bórralos primero o cancela la factura." }, { status: 400 });
    }
    await prisma.billingDocument.delete({ where: { id } });
    void logAudit({ resource: "billing_document", resourceId: id, resourceLabel: label(doc), action: "deleted", userId: session.user.id, userName: session.user.name });
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e, "document DELETE");
  }
}
