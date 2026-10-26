import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit-log";
import { companyDateKey } from "@/lib/time-clock";
import { computeTotals, r2, SETTLED_TOLERANCE } from "@/lib/billing";
import { APPLIED_SELECT, appliedOf, docFolio, failure, num, requireBilling, toDate } from "@/lib/billing-server";
import { pendingAttachments } from "@/lib/billing-attachments-server";
import { cfdiParty } from "@/lib/cfdi";

/**
 * POST /api/billing/documents/[id]/credit-notes
 * { issueDate, series?, folio?, uuid?, subtotal, ivaRate?, withholdingRate?, reason, attachmentIds? }
 *
 * Nota de crédito sobre la factura: baja su saldo sin movimiento de banco. Si
 * viene su XML, fecha, folio e importes son los del CFDI.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireBilling("update");
    const { id } = await params;
    const doc = await prisma.billingDocument.findUnique({ where: { id }, include: APPLIED_SELECT });
    if (!doc) return Response.json({ error: "No encontrado" }, { status: 404 });
    if (doc.cancelledAt) return Response.json({ error: "La factura está cancelada." }, { status: 400 });
    if (doc.draft) return Response.json({ error: "Es un borrador: todavía no es factura." }, { status: 400 });

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const text = (v: unknown) => (typeof v === "string" ? v.trim() || null : null);
    const pending = await pendingAttachments(body.attachmentIds, session.user.id, "E");
    const cfdi = pending.cfdi;

    let data: { issueDate: string; series: string | null; folio: string | null; uuid: string | null; subtotal: number; iva: number; ivaWithheld: number; isrWithheld: number; total: number };
    if (cfdi) {
      if (cfdi.currency !== doc.currency) return Response.json({ error: `La nota de crédito es en ${cfdi.currency} y la factura en ${doc.currency}.` }, { status: 400 });
      if (doc.uuid && cfdi.related.length > 0 && !cfdi.related.includes(doc.uuid)) {
        return Response.json({ error: "El XML de la nota de crédito está relacionado con otra factura, no con esta." }, { status: 400 });
      }
      const party = cfdiParty(cfdi, doc.kind);
      if (doc.partyRfc && party.rfc !== doc.partyRfc.toUpperCase()) {
        return Response.json({ error: `La nota de crédito es de otro RFC (${party.rfc}).` }, { status: 400 });
      }
      data = { ...cfdi, series: cfdi.series, folio: cfdi.folio, uuid: cfdi.uuid };
    } else {
      const issueDate = typeof body.issueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.issueDate) ? body.issueDate : null;
      if (!issueDate) return Response.json({ error: "Elige la fecha de la nota de crédito." }, { status: 400 });
      if (issueDate > companyDateKey()) return Response.json({ error: "La fecha no puede ser futura." }, { status: 400 });
      const subtotal = num(body.subtotal);
      if (!Number.isFinite(subtotal) || subtotal <= 0) return Response.json({ error: "Escribe el importe de la nota de crédito." }, { status: 400 });
      // Por omisión, el mismo IVA y la misma retención que la factura.
      const ivaRate = body.ivaRate === undefined || body.ivaRate === "" ? doc.ivaRate : num(body.ivaRate);
      const withholdingRate =
        body.withholdingRate === undefined || body.withholdingRate === "" ? (doc.subtotal > 0 ? doc.ivaWithheld / doc.subtotal : 0) : num(body.withholdingRate);
      if (!(ivaRate >= 0 && ivaRate <= 0.16) || !(withholdingRate >= 0 && withholdingRate <= 0.16)) {
        return Response.json({ error: "El IVA o la retención no son válidos." }, { status: 400 });
      }
      const t = computeTotals({ subtotal, ivaRate, withholdingRate });
      const uuid = text(body.uuid)?.toUpperCase() ?? null;
      if (uuid && !/^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/.test(uuid)) {
        return Response.json({ error: "El folio fiscal (UUID) no tiene el formato correcto." }, { status: 400 });
      }
      data = { issueDate, series: text(body.series)?.toUpperCase() ?? null, folio: text(body.folio)?.toUpperCase() ?? null, uuid, ...t, isrWithheld: 0 };
    }

    if (data.uuid && (await prisma.billingCreditNote.findFirst({ where: { uuid: data.uuid }, select: { id: true } }))) {
      return Response.json({ error: "Esa nota de crédito ya está registrada." }, { status: 409 });
    }
    const balance = r2(doc.total - appliedOf(doc).applied);
    if (data.total > balance + SETTLED_TOLERANCE) {
      return Response.json({ error: `La nota de crédito (${data.total.toFixed(2)}) pasa del saldo de la factura (${balance.toFixed(2)}).` }, { status: 400 });
    }
    const reason = text(body.reason) ?? cfdi?.concept ?? null;
    if (!reason || reason.length < 3) return Response.json({ error: "Escribe el motivo: descuento, devolución, bonificación…" }, { status: 400 });

    const note = await prisma.$transaction(async (tx) => {
      const n = await tx.billingCreditNote.create({
        data: {
          documentId: doc.id,
          issueDate: toDate(data.issueDate),
          series: data.series,
          folio: data.folio,
          uuid: data.uuid,
          subtotal: data.subtotal,
          iva: data.iva,
          ivaWithheld: data.ivaWithheld,
          isrWithheld: data.isrWithheld,
          total: data.total,
          reason: reason.slice(0, 300),
          createdById: session.user.id,
        },
      });
      if (pending.ids.length) {
        await tx.billingAttachment.updateMany({ where: { id: { in: pending.ids }, documentId: null }, data: { documentId: doc.id, creditNoteId: n.id } });
      }
      return n;
    });

    void logAudit({
      resource: "billing_document",
      resourceId: doc.id,
      resourceLabel: `${docFolio(doc)} · ${doc.partyName}`,
      action: "updated",
      userId: session.user.id,
      userName: session.user.name,
      changes: [{ field: "credit_note", label: "Nota de crédito", from: null, to: `${note.total.toFixed(2)} ${doc.currency} · ${note.reason}` }],
    });
    return Response.json({ id: note.id }, { status: 201 });
  } catch (e) {
    return failure(e, "credit note POST");
  }
}
