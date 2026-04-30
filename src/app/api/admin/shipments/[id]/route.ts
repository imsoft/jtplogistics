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
    incident: s.incident,
    incidentType: s.incidentType,
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
  incident: "Incidencia",
  incidentType: "Tipo de incidencia",
  status: "Estado",
};

const VALID_STATUSES = ["pending", "delivered", "delivered_with_delay", "not_delivered", "at_risk", "returned"] as const;
const SHIPMENT_CLOSED_STATUS: (typeof VALID_STATUSES)[number] = "returned";

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
      truck, trailer, unit, phone, comments, incident, incidentType, status,
      _confirmedEmail,
    } = body as Record<string, string | null | undefined>;

    const shipment = await prisma.shipment.findUnique({ where: { id } });
    if (!shipment) return Response.json({ error: "No encontrado" }, { status: 404 });

    const nextStatus =
      status !== undefined && status && VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])
        ? (status as (typeof VALID_STATUSES)[number])
        : shipment.status;

    // Regla: cuando el embarque está cerrado, no se permite modificar nada más a menos
    // que el usuario haya confirmado con su correo (_confirmedEmail === session.user.email).
    const emailConfirmed =
      typeof _confirmedEmail === "string" &&
      _confirmedEmail.toLowerCase() === session.user.email.toLowerCase();

    if (shipment.status === SHIPMENT_CLOSED_STATUS && !emailConfirmed) {
      return Response.json(
        { error: "El embarque está cerrado y no se puede modificar. Confirma tu correo electrónico para editar." },
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
    if (incident !== undefined) data.incident = (incident as string)?.trim() || null;
    if (incidentType !== undefined) data.incidentType = (incidentType as string)?.trim() || null;
    if (status !== undefined) {
      if (status && VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) data.status = status;
    }

    // Si el embarque acaba de pasar a "Cerrado", se crea automáticamente el registro en finanzas.
    const isClosingNow = shipment.status !== SHIPMENT_CLOSED_STATUS && nextStatus === SHIPMENT_CLOSED_STATUS;
    if (isClosingNow) {
      const merged = { ...shipment, ...data } as typeof shipment;

      const canDedup =
        merged.eco &&
        merged.client &&
        merged.origin &&
        merged.destination &&
        merged.pickupDate &&
        merged.deliveryDate;

      let existing: { id: string } | null = null;
      if (canDedup) {
        existing = await prisma.finance.findFirst({
          where: {
            eco: merged.eco,
            client: merged.client,
            origin: merged.origin,
            destination: merged.destination,
            pickupDate: merged.pickupDate,
            deliveryDate: merged.deliveryDate,
          },
          select: { id: true },
        });
      }

      if (!existing) {
        const finance = await prisma.finance.create({
          data: {
            eco: merged.eco ?? null,
            client: merged.client ?? null,
            origin: merged.origin ?? null,
            destination: merged.destination ?? null,
            sale: null,
            product: merged.product ?? null,
            pickupDate: merged.pickupDate ?? null,
            deliveryDate: merged.deliveryDate ?? null,
            legalName: merged.legalName ?? null,
            cost: null,
            operatorName: merged.operatorName ?? null,
            truck: merged.truck ?? null,
            trailer: merged.trailer ?? null,
            unit: merged.unit ?? null,
            phone: merged.phone ?? null,
            comments: merged.comments ?? null,
            incident: merged.incident ?? null,
            incidentType: merged.incidentType ?? null,
          },
        });

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
    if (shipment.status === SHIPMENT_CLOSED_STATUS) {
      return Response.json(
        { error: "El embarque está cerrado y no se puede eliminar. Para ello, reabre el embarque cambiando el estado." },
        { status: 403 },
      );
    }
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
