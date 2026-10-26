import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit-log";
import { requireSession } from "@/lib/auth-server";
import { hasModuleAccess } from "@/lib/module-access";
import { BILLING_MODULE, docFolio, failure, duplicateDocument } from "@/lib/billing-server";
import { cfdiDocumentFields, cfdiParty } from "@/lib/cfdi";
import { attachmentToJson, cfdiOverrides, readUpload, storeFile, sweepAbandoned, uuidTaken } from "@/lib/billing-attachments-server";

/**
 * POST /api/billing/attachments (multipart: file, kind=receivable|payable, documentId?)
 *
 * - Sin documentId: se sube mientras se captura una factura nueva. Si es el
 *   XML, regresa lo que se leyó para llenar el formulario; se liga a la
 *   factura al guardarla.
 * - Con documentId: se adjunta a una factura existente. Si es el XML, la
 *   factura toma su folio, folio fiscal e importes (y deja de ser borrador).
 */
export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const canCreate = await hasModuleAccess(session.user, BILLING_MODULE, "create");
    const canUpdate = await hasModuleAccess(session.user, BILLING_MODULE, "update");

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return Response.json({ error: "Elige el archivo." }, { status: 400 });
    const documentId = typeof form.get("documentId") === "string" ? (form.get("documentId") as string) : null;
    if (!(documentId ? canUpdate : canCreate)) return Response.json({ error: "Sin permiso" }, { status: 403 });

    const doc = documentId ? await prisma.billingDocument.findUnique({ where: { id: documentId } }) : null;
    if (documentId && !doc) return Response.json({ error: "La factura no existe." }, { status: 404 });
    const kind = doc?.kind ?? (form.get("kind") === "payable" ? "payable" : "receivable");
    // El PDF o XML de una nota de crédito: se sube suelto y se liga al guardarla.
    const forCreditNote = form.get("purpose") === "credit_note";
    if (forCreditNote && !canUpdate) return Response.json({ error: "Sin permiso" }, { status: 403 });

    const bytes = Buffer.from(await file.arrayBuffer());
    const read = readUpload(file.name, bytes, forCreditNote ? "E" : "I");
    if (!read.ok) return Response.json({ error: read.error }, { status: 400 });

    if (read.kind === "xml" && forCreditNote) {
      const dup = read.cfdi.uuid ? await prisma.billingCreditNote.findFirst({ where: { uuid: read.cfdi.uuid }, select: { id: true } }) : null;
      if (dup) return Response.json({ error: "Esa nota de crédito ya está registrada." }, { status: 409 });
    } else if (read.kind === "xml") {
      const dup = await uuidTaken(kind, read.cfdi.uuid, documentId ?? undefined);
      if (dup) return Response.json({ error: "Esa factura (folio fiscal) ya está capturada.", id: dup.id }, { status: 409 });
      if (doc) {
        if (doc.cancelledAt) return Response.json({ error: "La factura está cancelada." }, { status: 400 });
        // El XML de una nota de crédito no es el de la factura.
        const hasXml = await prisma.billingAttachment.count({ where: { documentId: doc.id, kind: "xml", creditNoteId: null } });
        if (hasXml) return Response.json({ error: "Esta factura ya tiene su XML. Bórralo primero si es otro." }, { status: 400 });
        const party = cfdiParty(read.cfdi, kind);
        if (doc.partyRfc && party.rfc !== doc.partyRfc.toUpperCase()) {
          return Response.json({ error: `El XML es de otro RFC (${party.rfc}), no de ${doc.partyRfc}.` }, { status: 400 });
        }
        if (await duplicateDocument(kind, { folio: read.cfdi.folio, series: read.cfdi.series, partyName: doc.partyName }, doc.id)) {
          return Response.json({ error: "Ya hay otra factura con ese folio." }, { status: 409 });
        }
        const [paid, credited] = await Promise.all([
          prisma.billingPayment.aggregate({ where: { documentId: doc.id }, _sum: { amount: true } }),
          prisma.billingCreditNote.aggregate({ where: { documentId: doc.id }, _sum: { total: true } }),
        ]);
        const applied = (paid._sum.amount ?? 0) + (credited._sum.total ?? 0);
        if (applied > 0.01 && read.cfdi.currency !== doc.currency) {
          return Response.json({ error: `Ya tiene pagos en ${doc.currency}: el XML en ${read.cfdi.currency} no puede cambiarle la moneda.` }, { status: 400 });
        }
        if (applied > read.cfdi.total + 0.01) {
          return Response.json({ error: "El total del XML es menor a lo ya pagado de esta factura." }, { status: 400 });
        }
      }
    }

    const storageId = await storeFile(bytes, read.kind);
    const cfdi = read.kind === "xml" ? read.cfdi : null;
    const attachment = await prisma.$transaction(async (tx) => {
      const a = await tx.billingAttachment.create({
        data: {
          documentId: forCreditNote ? null : (doc?.id ?? null),
          kind: read.kind,
          fileName: file.name.slice(0, 200) || `factura.${read.kind}`,
          size: bytes.length,
          storageId,
          cfdi: cfdi ? JSON.parse(JSON.stringify(cfdi)) : undefined,
          createdById: session.user.id,
        },
      });
      if (doc && cfdi && !forCreditNote) await tx.billingDocument.update({ where: { id: doc.id }, data: { ...cfdiOverrides(cfdi, kind), draft: false } });
      return a;
    });

    if (doc && !forCreditNote) {
      void logAudit({
        resource: "billing_document",
        resourceId: doc.id,
        resourceLabel: `${docFolio(cfdi ? { series: cfdi.series, folio: cfdi.folio } : doc)} · ${doc.partyName}`,
        action: "updated",
        userId: session.user.id,
        userName: session.user.name,
        changes: [{ field: "attachment", label: read.kind === "xml" ? "XML adjunto" : "PDF adjunto", from: null, to: attachment.fileName }],
      });
    }

    void sweepAbandoned().catch((e) => console.error("[billing] limpieza de adjuntos", e));
    return Response.json(
      { attachment: attachmentToJson(attachment), cfdi, fields: cfdi ? cfdiDocumentFields(cfdi, kind) : null },
      { status: 201 }
    );
  } catch (e) {
    return failure(e, "attachments POST");
  }
}
