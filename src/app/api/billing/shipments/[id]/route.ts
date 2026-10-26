import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit-log";
import { companyDateKey } from "@/lib/time-clock";
import { BILLING_KIND_LABELS, type BillingKind } from "@/lib/billing";
import { failure, requireBilling, toDate } from "@/lib/billing-server";
import { cartaPorteSnapshot, planShipmentBilling } from "@/lib/shipment-billing";
import { addDays, loadShipmentBillingContext } from "@/lib/shipment-billing-server";

/** GET: qué se facturaría (o qué ya se facturó) de este embarque. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireBilling("view");
    const { id } = await params;
    const ctx = await loadShipmentBillingContext(id);
    if (!ctx) return Response.json({ error: "No encontrado" }, { status: 404 });
    const plan = planShipmentBilling(ctx.shipment, ctx.client, ctx.carrier);
    return Response.json({
      ...plan,
      cartaPorte: cartaPorteSnapshot(ctx.shipment, ctx.carrier),
      clientFound: ctx.client !== null,
      carrierFound: ctx.carrier !== null,
      documents: ctx.documents,
    });
  } catch (e) {
    return failure(e, "shipment billing GET");
  }
}

/** POST { kinds: ["receivable", "payable"] }: crea los borradores que falten. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireBilling("create");
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as { kinds?: unknown };
    const kinds = (Array.isArray(body.kinds) ? body.kinds : []).filter((k): k is BillingKind => k === "receivable" || k === "payable");
    if (kinds.length === 0) return Response.json({ error: "Elige qué facturar." }, { status: 400 });

    const ctx = await loadShipmentBillingContext(id);
    if (!ctx) return Response.json({ error: "No encontrado" }, { status: 404 });
    const plan = planShipmentBilling(ctx.shipment, ctx.client, ctx.carrier);
    if (plan.blocked) return Response.json({ error: plan.blocked }, { status: 400 });

    for (const kind of kinds) {
      if (ctx.documents.some((d) => d.kind === kind)) {
        return Response.json({ error: `Este embarque ya tiene ${kind === "receivable" ? "factura al cliente" : "cuenta por pagar"}.` }, { status: 409 });
      }
      if (!plan[kind].plan) return Response.json({ error: plan[kind].reason }, { status: 400 });
    }

    const today = companyDateKey();
    const snapshot = cartaPorteSnapshot(ctx.shipment, ctx.carrier);
    const created = await prisma.$transaction(
      kinds.map((kind) => {
        const p = plan[kind].plan!;
        return prisma.billingDocument.create({
          data: {
            kind,
            draft: true,
            folio: null,
            shipmentId: id,
            partyName: p.partyName,
            partyRfc: p.partyRfc,
            clientId: p.clientId,
            issueDate: toDate(today),
            // La factura al cliente vence según sus días de crédito.
            dueDate: toDate(addDays(today, kind === "receivable" ? (ctx.client?.creditDays ?? 30) : 30)),
            currency: "MXN",
            exchangeRate: 1,
            subtotal: p.subtotal,
            ivaRate: p.ivaRate,
            iva: p.iva,
            ivaWithheld: p.ivaWithheld,
            total: p.total,
            paymentMethod: "PPD",
            concept: p.concept,
            reference: p.reference,
            source: "shipment",
            // La Carta Porte va en la factura al cliente.
            ...(kind === "receivable" && { cartaPorte: JSON.parse(JSON.stringify(snapshot)) }),
            createdById: session.user.id,
          },
          select: { id: true, kind: true, partyName: true },
        });
      })
    );

    for (const d of created) {
      void logAudit({
        resource: "billing_document",
        resourceId: d.id,
        resourceLabel: `${BILLING_KIND_LABELS[d.kind].singular} borrador · ${d.partyName}${ctx.shipment.eco ? ` · ECO ${ctx.shipment.eco}` : ""}`,
        action: "created",
        userId: session.user.id,
        userName: session.user.name,
      });
    }
    return Response.json({ documents: created.map((d) => ({ id: d.id, kind: d.kind })) }, { status: 201 });
  } catch (e) {
    return failure(e, "shipment billing POST");
  }
}
