import { prisma } from "@/lib/db";
import { readExtraCosts } from "@/lib/shipment-extras";

/** Costos extra en texto para la bitácora: "Maniobras $1,500/$1,000; …". */
function extrasText(v: unknown): string {
  return readExtraCosts(v).map((x) => `${x.concept} $${x.sale ?? 0}/$${x.cost ?? 0}`).join("; ");
}
import { incidentAllowsIncidentType } from "@/lib/incident-yes-no";
import { adminHandler } from "@/lib/api-handler";
import { logAudit, diffObjects } from "@/lib/audit-log";
import { shipmentDeleteBlock, shipmentLockReason, LOCK_TEXT } from "@/lib/shipment-lock";
import { readTariffs, isTariffOnlyBody, canManageTariffs } from "@/lib/shipment-tariffs";
import { outcomeAfterStatus } from "@/lib/shipment-outcome";
import { deleteShipmentWithFinance, syncShipmentFinance } from "@/lib/shipment-tariffs-server";

function toJson(s: {
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
  originAddress?: string | null;
  destinationAddress?: string | null;
  extraCosts?: unknown;
  incident: string | null;
  incidentType: string | null;
  sale?: number | null;
  cost?: number | null;
  deliveryOutcome?: string | null;
  status: string;
  createdAt: Date;
}) {
  return {
    id: s.id,
    eco: s.eco,
    client: s.client,
    origin: s.origin,
    destination: s.destination,
    product: s.product,
    pickupDate: s.pickupDate?.toISOString() ?? null,
    deliveryDate: s.deliveryDate?.toISOString() ?? null,
    legalName: s.legalName,
    operatorName: s.operatorName,
    truck: s.truck,
    trailer: s.trailer,
    unit: s.unit,
    phone: s.phone,
    comments: s.comments,
    originAddress: s.originAddress ?? null,
    destinationAddress: s.destinationAddress ?? null,
    extraCosts: readExtraCosts(s.extraCosts),
    incident: s.incident,
    incidentType: s.incidentType,
    sale: s.sale ?? null,
    cost: s.cost ?? null,
    deliveryOutcome: s.deliveryOutcome ?? null,
    status: s.status,
    createdAt: s.createdAt.toISOString(),
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
    return Response.json(toJson(shipment));
  });
}

const SHIPMENT_LABELS: Record<string, string> = {
  eco: "ECO",
  client: "Cliente",
  origin: "Origen",
  destination: "Destino",
  product: "Producto",
  pickupDate: "Recolección",
  deliveryDate: "Entrega",
  legalName: "Proveedor",
  operatorName: "Nombre operador",
  truck: "Tracto",
  trailer: "Caja",
  unit: "Unidad",
  phone: "Celular",
  comments: "Comentarios",
  originAddress: "Dirección de origen",
  destinationAddress: "Dirección de destino",
  extraCosts: "Costos extra",
  incident: "Incidencia",
  incidentType: "Tipo de incidencia",
  status: "Estado",
  sale: "Tarifa de venta",
  cost: "Tarifa de compra",
};

const VALID_STATUSES = ["pending", "in_transit", "delivered", "delivered_with_delay", "not_delivered", "at_risk", "returned"] as const;
const SHIPMENT_CLOSED_STATUS: (typeof VALID_STATUSES)[number] = "returned";

export function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminHandler(async (session) => {
    const { id } = await params;
    const body = await request.json();
    const canTariffs = canManageTariffs(session.user);
    const {
      eco, client, origin, destination, product,
      pickupDate, deliveryDate, legalName, operatorName,
      truck, trailer, unit, phone, comments, incident, incidentType, status, originAddress, destinationAddress,
      _confirmedEmail,
    } = body as Record<string, string | null | undefined>;

    const tariffs = readTariffs(body as Record<string, unknown>);
    if (!tariffs.ok) return Response.json({ error: tariffs.error }, { status: 400 });
    const touchesTariffs = Object.keys(tariffs.data).length > 0;
    if (touchesTariffs && !canTariffs) {
      return Response.json({ error: "Sin permiso para capturar tarifas" }, { status: 403 });
    }

    const shipment = await prisma.shipment.findUnique({ where: { id } });
    if (!shipment) return Response.json({ error: "No encontrado" }, { status: 404 });


    // Regla: cuando el embarque está cerrado, no se permite modificar nada más a menos
    // que el usuario haya confirmado con su correo (_confirmedEmail === session.user.email).
    const emailConfirmed =
      typeof _confirmedEmail === "string" &&
      _confirmedEmail.toLowerCase() === session.user.email.toLowerCase();

    // Cerrado o sin incidencias: solo lectura, salvo que confirme su correo.
    const lock = shipmentLockReason(shipment);
    // Las tarifas se pueden capturar aunque esté bloqueado: suelen confirmarse al cerrar.
    const tariffOnly = canTariffs && isTariffOnlyBody(body as Record<string, unknown>);
    if (lock && !emailConfirmed && !tariffOnly) {
      return Response.json(
        { error: `${LOCK_TEXT[lock].title}: no se puede modificar. Confirma tu correo electrónico para editar.` },
        { status: 403 },
      );
    }

    const data: Record<string, unknown> = {};
    if (eco !== undefined) data.eco = (eco as string)?.trim() || null;
    if (client !== undefined) data.client = (client as string)?.trim() || null;
    if (origin !== undefined) data.origin = (origin as string)?.trim() || null;
    if (destination !== undefined) data.destination = (destination as string)?.trim() || null;
    if (product !== undefined) data.product = (product as string)?.trim() || null;
    if (pickupDate !== undefined) data.pickupDate = pickupDate ? new Date(pickupDate) : null;
    if (deliveryDate !== undefined) data.deliveryDate = deliveryDate ? new Date(deliveryDate) : null;
    if (legalName !== undefined) data.legalName = (legalName as string)?.trim() || null;
    if (operatorName !== undefined) data.operatorName = (operatorName as string)?.trim() || null;
    if (truck !== undefined) data.truck = (truck as string)?.trim() || null;
    if (trailer !== undefined) data.trailer = (trailer as string)?.trim() || null;
    if (unit !== undefined) data.unit = (unit as string)?.trim() || null;
    if (phone !== undefined) data.phone = (phone as string)?.trim() || null;
    if (comments !== undefined) data.comments = (comments as string)?.trim() || null;
    if (originAddress !== undefined) data.originAddress = (originAddress as string)?.trim() || null;
    if (destinationAddress !== undefined) data.destinationAddress = (destinationAddress as string)?.trim() || null;
    if (incident !== undefined) data.incident = (incident as string)?.trim() || null;
    if (incidentType !== undefined) data.incidentType = (incidentType as string)?.trim() || null;
    // Sin incidencia no hay tipo de incidencia (con la incidencia que quede guardada).
    const finalIncident = incident !== undefined ? (data.incident as string | null) : shipment.incident;
    if (!incidentAllowsIncidentType(finalIncident ?? "")) data.incidentType = null;
    if (status !== undefined) {
      if (status && VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) data.status = status;
    }
    Object.assign(data, tariffs.data);
    // El resultado de la entrega sobrevive al cierre (lo usa la calificación de transportistas).
    if (data.status !== undefined && data.status !== shipment.status) {
      data.deliveryOutcome = outcomeAfterStatus(data.status as string, shipment.deliveryOutcome);
    }

    const updated = await prisma.shipment.update({ where: { id }, data });
    // Un solo registro de finanzas por embarque: se crea al cerrarlo y se
    // actualiza si se edita cerrado o se reabre y se vuelve a cerrar.
    if (touchesTariffs || updated.status === SHIPMENT_CLOSED_STATUS || shipment.status === SHIPMENT_CLOSED_STATUS) {
      const finance = await syncShipmentFinance(updated, SHIPMENT_CLOSED_STATUS);
      if (finance) {
        void logAudit({
          resource: "finance",
          resourceId: finance.id,
          resourceLabel: `${finance.eco ?? ""} – ${finance.origin ?? ""} → ${finance.destination ?? ""}`.trim(),
          action: "created",
          userId: session.user.id,
          userName: session.user.name,
        });
      }
    }

    const changes = diffObjects(
      { ...shipment, extraCosts: extrasText(shipment.extraCosts) } as unknown as Record<string, unknown>,
      { ...updated, extraCosts: extrasText(updated.extraCosts) } as unknown as Record<string, unknown>,
      SHIPMENT_LABELS
    );
    if (changes.length > 0) {
      void logAudit({
        resource: "shipment",
        resourceId: id,
        resourceLabel: `${updated.eco ?? ""} – ${updated.origin ?? ""} → ${updated.destination ?? ""}`.trim(),
        action: "updated",
        userId: session.user.id,
        userName: session.user.name,
        changes,
      });
    }

    return Response.json({ ok: true });
  });
}

export function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminHandler(async (session) => {
    const { id } = await params;
    const shipment = await prisma.shipment.findUnique({ where: { id } });
    if (!shipment) return Response.json({ error: "No encontrado" }, { status: 404 });
    // Cerrado o sin incidencias: solo dirección, confirmando su correo.
    const body = (await req.json().catch(() => ({}))) as { confirmEmail?: unknown };
    const block = shipmentDeleteBlock(shipment, {
      isAdmin: session.user.role === "admin",
      emailConfirmed:
        typeof body.confirmEmail === "string" &&
        body.confirmEmail.trim().toLowerCase() === session.user.email.toLowerCase(),
    });
    if (block) return Response.json({ error: block }, { status: 403 });
    await deleteShipmentWithFinance(shipment);
    void logAudit({
      resource: "shipment",
      resourceId: id,
      resourceLabel: `${shipment.eco ?? ""} – ${shipment.origin ?? ""} → ${shipment.destination ?? ""}`.trim(),
      action: "deleted",
      userId: session.user.id,
      userName: session.user.name,
    });
    return Response.json({ ok: true });
  });
}
