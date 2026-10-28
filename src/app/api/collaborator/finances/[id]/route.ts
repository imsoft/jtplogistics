import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit-log";
import { companyDateKey } from "@/lib/time-clock";
import { effectiveTariffs } from "@/lib/shipment-tariffs";
import { readExtraCosts } from "@/lib/shipment-extras";
import { requireCollaboratorOrAdmin } from "@/lib/auth-server";
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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireCollaboratorOrAdmin();
    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { canViewFinances: true },
    });
    if (!me?.canViewFinances) {
      return Response.json({ error: "Sin permiso" }, { status: 403 });
    }

    const { id } = await params;
    const shipment = await prisma.shipment.findUnique({ where: { id } });
    if (!shipment) return Response.json({ error: "No encontrado" }, { status: 404 });

    const finances = await prisma.finance.findMany({ orderBy: { createdAt: "desc" } });
    const finance = findFinanceForShipment(shipment, finances);

    return Response.json(toDetail(shipment, finance));
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

/**
 * DELETE /api/collaborator/finances/[id] — quita las tarifas del embarque.
 * Dirección siempre; el colaborador con el permiso de eliminar en Finanzas.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireCollaboratorOrAdmin();
    if (session.user.role !== "admin") {
      const me = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { canDeleteFinances: true },
      });
      if (!me?.canDeleteFinances) return Response.json({ error: "Sin permiso" }, { status: 403 });
    }
    const { id } = await params;
    return await clearTariffsResponse(id, session.user);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
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

/** PATCH /api/collaborator/finances/[id] { evidenceReceived } — con permiso de editar Finanzas. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCollaboratorOrAdmin();
    if (session.user.role !== "admin") {
      const me = await prisma.user.findUnique({ where: { id: session.user.id }, select: { canUpdateFinances: true } });
      if (!me?.canUpdateFinances) return Response.json({ error: "Sin permiso" }, { status: 403 });
    }
    const { id } = await params;
    return await setEvidence(id, await req.json().catch(() => ({})), session.user);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
