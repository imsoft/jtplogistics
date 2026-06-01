import { Prisma, ShipmentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { adminHandler } from "@/lib/api-handler";
import { logAudit } from "@/lib/audit-log";

/** Campos sobre los que aplica la búsqueda de texto (server-side). */
const SEARCH_FIELDS = [
  "eco", "client", "legalName", "origin", "destination", "product",
  "truck", "trailer", "unit", "phone", "comments", "incident", "incidentType",
] as const;

/** Columnas permitidas para ordenar (whitelist contra inyección). */
const SORTABLE_FIELDS = new Set([
  "status", "eco", "client", "origin", "destination", "pickupDate",
  "deliveryDate", "legalName", "comments", "incidentType", "phone",
  "incident", "createdAt",
]);

const VALID_STATUSES: ShipmentStatus[] = [
  "pending", "delivered", "delivered_with_delay", "not_delivered", "at_risk", "returned",
];

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

export function GET(request: Request) {
  return adminHandler(async (session) => {
    // Backfill de finanzas para embarques cerrados (comportamiento preexistente):
    // se ejecuta sobre TODOS los cerrados, independiente de la paginación/filtros.
    const closedShipments = await prisma.shipment.findMany({
      where: { status: "returned" },
      orderBy: { createdAt: "desc" },
    });

    // Cuando un embarque ya está en estado "Cerrado" (returned), aseguramos que exista su registro en finanzas.
    // Esto cubre también embarques que ya estaban cerrados antes de activar la lógica de transferencia.
    for (const shipment of closedShipments) {
      const canDedupByCore =
        shipment.eco && shipment.client && shipment.origin && shipment.destination;

      if (!canDedupByCore) continue;

      const existing = await prisma.finance.findFirst({
        where: {
          eco: shipment.eco,
          client: shipment.client,
          origin: shipment.origin,
          destination: shipment.destination,
          ...(shipment.pickupDate ? { pickupDate: shipment.pickupDate } : {}),
          ...(shipment.deliveryDate ? { deliveryDate: shipment.deliveryDate } : {}),
        },
        select: { id: true },
      });

      if (existing) continue;

      const finance = await prisma.finance.create({
        data: {
          eco: shipment.eco ?? null,
          client: shipment.client ?? null,
          origin: shipment.origin ?? null,
          destination: shipment.destination ?? null,
          sale: null,
          product: shipment.product ?? null,
          pickupDate: shipment.pickupDate ?? null,
          deliveryDate: shipment.deliveryDate ?? null,
          legalName: shipment.legalName ?? null,
          cost: null,
          operatorName: shipment.operatorName ?? null,
          truck: shipment.truck ?? null,
          trailer: shipment.trailer ?? null,
          unit: shipment.unit ?? null,
          phone: shipment.phone ?? null,
          comments: shipment.comments ?? null,
          incident: shipment.incident ?? null,
          incidentType: shipment.incidentType ?? null,
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

    const { searchParams } = new URL(request.url);
    const all = searchParams.get("all") === "1";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const pageSize = Math.min(200, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10) || 20));
    const q = (searchParams.get("q") ?? "").trim();
    const status = searchParams.get("status");
    const pickupFrom = searchParams.get("pickupFrom");
    const pickupTo = searchParams.get("pickupTo");
    const deliveryFrom = searchParams.get("deliveryFrom");
    const deliveryTo = searchParams.get("deliveryTo");
    const sortBy = searchParams.get("sortBy") ?? "createdAt";
    const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";

    const where: Prisma.ShipmentWhereInput = {};

    if (status && VALID_STATUSES.includes(status as ShipmentStatus)) {
      where.status = status as ShipmentStatus;
    }

    if (q) {
      where.OR = SEARCH_FIELDS.map((field) => ({
        [field]: { contains: q, mode: "insensitive" as Prisma.QueryMode },
      })) as Prisma.ShipmentWhereInput[];
    }

    const pickup: Prisma.DateTimeNullableFilter = {};
    if (pickupFrom) pickup.gte = new Date(`${pickupFrom}T00:00:00.000Z`);
    if (pickupTo) pickup.lte = new Date(`${pickupTo}T23:59:59.999Z`);
    if (pickupFrom || pickupTo) where.pickupDate = pickup;

    const delivery: Prisma.DateTimeNullableFilter = {};
    if (deliveryFrom) delivery.gte = new Date(`${deliveryFrom}T00:00:00.000Z`);
    if (deliveryTo) delivery.lte = new Date(`${deliveryTo}T23:59:59.999Z`);
    if (deliveryFrom || deliveryTo) where.deliveryDate = delivery;

    const orderBy: Prisma.ShipmentOrderByWithRelationInput = SORTABLE_FIELDS.has(sortBy)
      ? ({ [sortBy]: sortDir } as Prisma.ShipmentOrderByWithRelationInput)
      : { createdAt: "desc" };

    const [total, shipments] = await Promise.all([
      prisma.shipment.count({ where }),
      prisma.shipment.findMany({
        where,
        orderBy,
        ...(all ? {} : { skip: (page - 1) * pageSize, take: pageSize }),
      }),
    ]);

    return Response.json({
      data: shipments.map(toJson),
      total,
      page,
      pageSize,
    });
  });
}

export function POST(request: Request) {
  return adminHandler(async (session) => {
    const body = await request.json();
    const {
      eco, client, origin, destination, product,
      pickupDate, deliveryDate, legalName, operatorName,
      truck, trailer, unit, phone, comments, incident, incidentType, status,
    } = body as Record<string, string | undefined>;

    const validStatuses = ["pending", "delivered", "delivered_with_delay", "not_delivered", "at_risk", "returned"];

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
        ...(status && validStatuses.includes(status) && { status: status as "pending" }),
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
