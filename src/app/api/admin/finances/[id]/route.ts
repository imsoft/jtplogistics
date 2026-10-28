import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit-log";
import { companyDateKey } from "@/lib/time-clock";
import { effectiveTariffs } from "@/lib/shipment-tariffs";
import { readExtraCosts } from "@/lib/shipment-extras";
import { adminHandler } from "@/lib/api-handler";
import { findFinanceForShipment } from "@/lib/finance-shipment-match";
import { clearTariffsResponse } from "@/lib/finance-tariffs-delete";
import type { FinanceShipmentDetail } from "@/types/finance.types";

function toDetail(
  shipment: {
    id: string;
    eco: string | null;
    client: string | null;
    origin: string | null;
    destination: string | null;
    product: string | null;
    pickupDate: Date | null;
    deliveryDate: Date | null;
    legalName: string | null;
    operatorName: string | null;
    truck: string | null;
    trailer: string | null;
    unit: string | null;
    phone: string | null;
    comments: string | null;
    incident: string | null;
    incidentType: string | null;
    sale?: number | null;
    cost?: number | null;
    extraCosts?: unknown;
    originAddress?: string | null;
    destinationAddress?: string | null;
    evidenceReceivedOn?: Date | null;
    status: string;
    createdAt: Date;
  },
  finance: { id: string; sale: number | null; cost: number | null } | null
): FinanceShipmentDetail {
  return {
    id: shipment.id,
    shipmentId: shipment.id,
    financeId: finance?.id ?? null,
    status: shipment.status,
    eco: shipment.eco,
    client: shipment.client,
    origin: shipment.origin,
    destination: shipment.destination,
    // La tarifa se captura en el embarque; los registros viejos la traen de Finanzas.
    // Total: tarifa base más costos extra (los registros viejos, de Finanzas).
    ...effectiveTariffs(shipment, finance),
    baseSale: shipment.sale ?? null,
    baseCost: shipment.cost ?? null,
    extraCosts: readExtraCosts(shipment.extraCosts),
    originAddress: shipment.originAddress ?? null,
    destinationAddress: shipment.destinationAddress ?? null,
    evidenceReceivedOn: shipment.evidenceReceivedOn ? shipment.evidenceReceivedOn.toISOString().slice(0, 10) : null,
    product: shipment.product,
    pickupDate: shipment.pickupDate?.toISOString() ?? null,
    deliveryDate: shipment.deliveryDate?.toISOString() ?? null,
    legalName: shipment.legalName,
    operatorName: shipment.operatorName,
    truck: shipment.truck,
    trailer: shipment.trailer,
    unit: shipment.unit,
    phone: shipment.phone,
    comments: shipment.comments,
    incident: shipment.incident,
    incidentType: shipment.incidentType,
    createdAt: shipment.createdAt.toISOString(),
  };
}

export function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminHandler(async () => {
    const { id } = await params;
    const shipment = await prisma.shipment.findUnique({ where: { id } });
    if (!shipment) return Response.json({ error: "No encontrado" }, { status: 404 });

    const finances = await prisma.finance.findMany({ orderBy: { createdAt: "desc" } });
    const finance = findFinanceForShipment(shipment, finances);

    return Response.json(toDetail(shipment, finance));
  });
}

/**
 * DELETE /api/admin/finances/[id] — quita las tarifas de venta y compra del
 * embarque (el id es el del embarque). El embarque sigue en su tabla.
 */
export function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminHandler(async (session) => {
    const { id } = await params;
    return clearTariffsResponse(id, session.user);
  });
}

/**
 * Marca o quita "evidencias recibidas" (remisión o carta porte firmada) del
 * embarque. Se guarda el día en que se marcó.
 */
async function setEvidence(id: string, body: unknown, user: { id: string; name: string }): Promise<Response> {
  const received = (body as { evidenceReceived?: unknown })?.evidenceReceived;
  if (typeof received !== "boolean") return Response.json({ error: "Datos inválidos" }, { status: 400 });
  const shipment = await prisma.shipment.findUnique({ where: { id }, select: { eco: true, origin: true, destination: true, evidenceReceivedOn: true } });
  if (!shipment) return Response.json({ error: "No encontrado" }, { status: 404 });
  const on = received ? new Date(`${companyDateKey(new Date())}T00:00:00.000Z`) : null;
  await prisma.shipment.update({ where: { id }, data: { evidenceReceivedOn: on } });
  void logAudit({
    resource: "shipment",
    resourceId: id,
    resourceLabel: `${shipment.eco ?? ""} – ${shipment.origin ?? ""} → ${shipment.destination ?? ""}`.trim(),
    action: "updated",
    userId: user.id,
    userName: user.name,
    changes: [{ field: "evidenceReceivedOn", label: "Evidencias recibidas", from: shipment.evidenceReceivedOn ? "sí" : "no", to: received ? "sí" : "no" }],
  });
  return Response.json({ evidenceReceivedOn: on ? on.toISOString().slice(0, 10) : null });
}

/** PATCH /api/admin/finances/[id] { evidenceReceived } */
export function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return adminHandler(async (session) => {
    const { id } = await params;
    return setEvidence(id, await req.json().catch(() => ({})), session.user);
  });
}
