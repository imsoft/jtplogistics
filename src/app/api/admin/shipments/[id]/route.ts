import { prisma } from "@/lib/db";
import { adminHandler } from "@/lib/api-handler";
import { logAudit, diffObjects } from "@/lib/audit-log";

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
  incident: string | null;
  incidentType: string | null;
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
    incident: s.incident,
    incidentType: s.incidentType,
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
  legalName: "Razón social",
  operatorName: "Nombre operador",
  truck: "Tracto",
  trailer: "Caja",
  unit: "Unidad",
  phone: "Celular",
  comments: "Comentarios",
  incident: "Incidencia",
  incidentType: "Tipo de incidencia",
};

export function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminHandler(async (session) => {
    const { id } = await params;
    const body = await request.json();
    const {
      eco, client, origin, destination, product,
      pickupDate, deliveryDate, legalName, operatorName,
      truck, trailer, unit, phone, comments, incident, incidentType,
    } = body as Record<string, string | null | undefined>;

    const shipment = await prisma.shipment.findUnique({ where: { id } });
    if (!shipment) return Response.json({ error: "No encontrado" }, { status: 404 });

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
    if (incident !== undefined) data.incident = (incident as string)?.trim() || null;
    if (incidentType !== undefined) data.incidentType = (incidentType as string)?.trim() || null;

    const updated = await prisma.shipment.update({ where: { id }, data });

    const changes = diffObjects(
      shipment as unknown as Record<string, unknown>,
      updated as unknown as Record<string, unknown>,
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
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminHandler(async (session) => {
    const { id } = await params;
    const shipment = await prisma.shipment.findUnique({ where: { id } });
    if (!shipment) return Response.json({ error: "No encontrado" }, { status: 404 });
    await prisma.shipment.delete({ where: { id } });
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
