import { prisma } from "@/lib/db";
import { requireCollaboratorOrAdmin } from "@/lib/auth-server";
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

export async function GET() {
  try {
    const session = await requireCollaboratorOrAdmin();
    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { canViewFinances: true },
    });
    if (!me?.canViewFinances) {
      return Response.json({ error: "Sin permiso" }, { status: 403 });
    }

    const [shipments, finances] = await Promise.all([
      prisma.shipment.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.finance.findMany({ orderBy: { createdAt: "desc" } }),
    ]);

    const rows: FinanceListRow[] = shipments.map((s) =>
      rowFromShipmentAndFinance(s, findFinanceForShipment(s, finances))
    );

    return Response.json(rows);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
