import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit-log";
import { companyDateKey } from "@/lib/time-clock";
import { BILLING_KIND_LABELS } from "@/lib/billing";
import { DOC_INCLUDE, docFolio, documentToJson, failure, isBillingKind, openDocumentBalances, readDocumentBody, requireBilling } from "@/lib/billing-server";
import { cfdiOverrides, pendingAttachments, withCfdiBody } from "@/lib/billing-attachments-server";

/** Ventana de la lista por omisión: lo abierto siempre, lo saldado de estos meses. */
const RECENT_MONTHS = 6;

/**
 * GET /api/billing/documents?kind=receivable|payable&q=&history=all
 * Sin `history=all`: todas las facturas con saldo (y borradores) más las de
 * los últimos meses. El saldo y la antigüedad salen completos; lo viejo y
 * ya saldado se pide aparte para no cargar años de historial cada vez.
 */
export async function GET(request: Request) {
  try {
    await requireBilling("view");
    const { searchParams } = new URL(request.url);
    const kind = searchParams.get("kind");
    if (!isBillingKind(kind)) return Response.json({ error: "Tipo inválido" }, { status: 400 });
    const q = (searchParams.get("q") ?? "").trim();
    const where: Prisma.BillingDocumentWhereInput = { kind };
    const and: Prisma.BillingDocumentWhereInput[] = [];
    if (q) {
      and.push({
        OR: (["partyName", "partyRfc", "folio", "series", "uuid", "concept", "reference"] as const).map((f) => ({
          [f]: { contains: q, mode: "insensitive" as Prisma.QueryMode },
        })),
      });
    }
    if (searchParams.get("history") !== "all") {
      const since = new Date();
      since.setUTCMonth(since.getUTCMonth() - RECENT_MONTHS);
      const open = (await openDocumentBalances()).filter((d) => d.kind === kind).map((d) => d.id);
      and.push({ OR: [{ id: { in: open } }, { issueDate: { gte: since } }] });
    }
    if (and.length) where.AND = and;
    const docs = await prisma.billingDocument.findMany({
      where,
      orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
      include: DOC_INCLUDE,
    });
    const today = companyDateKey();
    return Response.json(docs.map((d) => documentToJson(d, today)));
  } catch (e) {
    return failure(e, "documents GET");
  }
}

/** POST /api/billing/documents */
export async function POST(request: Request) {
  try {
    const session = await requireBilling("create");
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    if (!isBillingKind(body.kind)) return Response.json({ error: "Tipo inválido" }, { status: 400 });
    const kind = body.kind;
    // Con el XML, folio, folio fiscal e importes son los del CFDI.
    const pending = await pendingAttachments(body.attachmentIds, session.user.id);
    const parsed = readDocumentBody(withCfdiBody(body, pending.cfdi));
    if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
    const data = parsed.data;
    if (kind === "payable") data.clientId = null;
    if (pending.cfdi) Object.assign(data, cfdiOverrides(pending.cfdi, kind), { draft: false });

    // Evita capturar dos veces la misma factura (pasa al migrar desde Alegra).
    const dup = !data.folio ? null : await prisma.billingDocument.findFirst({
      where: {
        kind,
        folio: data.folio,
        series: data.series ?? null,
        partyName: { equals: data.partyName, mode: "insensitive" },
      },
      select: { id: true },
    });
    const dupUuid = data.uuid
      ? await prisma.billingDocument.findFirst({ where: { kind, uuid: data.uuid }, select: { id: true } })
      : null;
    if (dup || dupUuid) {
      return Response.json({ error: "Esa factura ya está capturada.", id: (dup ?? dupUuid)!.id }, { status: 409 });
    }

    const created = await prisma.$transaction(async (tx) => {
      const doc = await tx.billingDocument.create({
        data: { ...data, kind, createdById: session.user.id },
        select: { id: true },
      });
      if (pending.ids.length) {
        await tx.billingAttachment.updateMany({ where: { id: { in: pending.ids }, documentId: null }, data: { documentId: doc.id } });
      }
      return doc;
    });

    void logAudit({
      resource: "billing_document",
      resourceId: created.id,
      resourceLabel: `${BILLING_KIND_LABELS[kind].singular} ${docFolio({ series: data.series ?? null, folio: data.folio ?? null })} · ${data.partyName}`,
      action: "created",
      userId: session.user.id,
      userName: session.user.name,
    });

    return Response.json({ id: created.id }, { status: 201 });
  } catch (e) {
    return failure(e, "documents POST");
  }
}
