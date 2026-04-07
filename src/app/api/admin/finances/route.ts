import { prisma } from "@/lib/db";
import { adminHandler } from "@/lib/api-handler";
import { findFinanceForShipment } from "@/lib/finance-shipment-match";
import type { FinanceListRow } from "@/types/finance.types";

function rowFromShipmentAndFinance(
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
    status: string;
    createdAt: Date;
  },
  finance: { id: string; sale: number | null; cost: number | null } | null
): FinanceListRow {
  return {
    id: shipment.id,
    shipmentId: shipment.id,
    financeId: finance?.id ?? null,
    status: shipment.status,
    eco: shipment.eco,
    client: shipment.client,
    origin: shipment.origin,
    destination: shipment.destination,
    sale: finance?.sale ?? null,
    cost: finance?.cost ?? null,
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

export function GET() {
  return adminHandler(async () => {
    const [shipments, finances] = await Promise.all([
      prisma.shipment.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.finance.findMany({ orderBy: { createdAt: "desc" } }),
    ]);

    const rows: FinanceListRow[] = shipments.map((s) =>
      rowFromShipmentAndFinance(s, findFinanceForShipment(s, finances))
    );

    return Response.json(rows);
  });
}

export function POST() {
  return adminHandler(async () =>
    Response.json(
      {
        error:
          "La tabla de finanzas es solo de consulta. Crea y edita embarques en la tabla de embarques.",
      },
      { status: 403 }
    )
  );
}
