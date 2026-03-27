import { prisma } from "@/lib/db";
import { adminHandler } from "@/lib/api-handler";
import { logAudit } from "@/lib/audit-log";

function toJson(f: {
  id: string;
  eco: string | null;
  client: string | null;
  origin: string | null;
  destination: string | null;
  sale: number | null;
  product: string | null;
  pickupDate: Date | null;
  deliveryDate: Date | null;
  legalName: string | null;
  cost: number | null;
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
    id: f.id,
    eco: f.eco,
    client: f.client,
    origin: f.origin,
    destination: f.destination,
    sale: f.sale,
    product: f.product,
    pickupDate: f.pickupDate?.toISOString() ?? null,
    deliveryDate: f.deliveryDate?.toISOString() ?? null,
    legalName: f.legalName,
    cost: f.cost,
    operatorName: f.operatorName,
    truck: f.truck,
    trailer: f.trailer,
    unit: f.unit,
    phone: f.phone,
    comments: f.comments,
    incident: f.incident,
    incidentType: f.incidentType,
    createdAt: f.createdAt.toISOString(),
  };
}

export function GET() {
  return adminHandler(async () => {
    const finances = await prisma.finance.findMany({
      orderBy: { createdAt: "desc" },
    });
    return Response.json(finances.map(toJson));
  });
}

export function POST(request: Request) {
  return adminHandler(async (session) => {
    const body = await request.json();
    const {
      eco, client, origin, destination, sale, product,
      pickupDate, deliveryDate, legalName, cost, operatorName,
      truck, trailer, unit, phone, comments, incident, incidentType,
    } = body as Record<string, string | undefined>;

    const parsedSale = sale ? parseFloat(sale) : null;
    const parsedCost = cost ? parseFloat(cost) : null;

    const finance = await prisma.finance.create({
      data: {
        eco: eco?.trim() || null,
        client: client?.trim() || null,
        origin: origin?.trim() || null,
        destination: destination?.trim() || null,
        sale: parsedSale != null && !isNaN(parsedSale) ? parsedSale : null,
        product: product?.trim() || null,
        pickupDate: pickupDate ? new Date(pickupDate) : null,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        legalName: legalName?.trim() || null,
        cost: parsedCost != null && !isNaN(parsedCost) ? parsedCost : null,
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
      resource: "finance",
      resourceId: finance.id,
      resourceLabel: `${eco ?? ""} – ${origin ?? ""} → ${destination ?? ""}`.trim(),
      action: "created",
      userId: session.user.id,
      userName: session.user.name,
    });

    return Response.json({ id: finance.id }, { status: 201 });
  });
}
