import { prisma } from "@/lib/db";
import { adminHandler } from "@/lib/api-handler";
import { logAudit } from "@/lib/audit-log";

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

export function GET() {
  return adminHandler(async () => {
    const shipments = await prisma.shipment.findMany({
      orderBy: { createdAt: "desc" },
    });
    return Response.json(shipments.map(toJson));
  });
}

export function POST(request: Request) {
  return adminHandler(async (session) => {
    const body = await request.json();
    const {
      eco, client, origin, destination, product,
      pickupDate, deliveryDate, legalName, operatorName,
      truck, trailer, unit, phone, comments, incident, incidentType,
    } = body as Record<string, string | undefined>;

    const shipment = await prisma.shipment.create({
      data: {
        eco: eco?.trim() || null,
        client: client?.trim() || null,
        origin: origin?.trim() || null,
        destination: destination?.trim() || null,
        product: product?.trim() || null,
        pickupDate: pickupDate ? new Date(pickupDate) : null,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        legalName: legalName?.trim() || null,
        operatorName: operatorName?.trim() || null,
        truck: truck?.trim() || null,
        trailer: trailer?.trim() || null,
        unit: unit?.trim() || null,
        phone: phone?.trim() || null,
        comments: comments?.trim() || null,
        incident: incident?.trim() || null,
        incidentType: incidentType?.trim() || null,
      },
    });

    void logAudit({
      resource: "shipment",
      resourceId: shipment.id,
      resourceLabel: `${eco ?? ""} – ${origin ?? ""} → ${destination ?? ""}`.trim(),
      action: "created",
      userId: session.user.id,
      userName: session.user.name,
    });

    return Response.json({ id: shipment.id }, { status: 201 });
  });
}
