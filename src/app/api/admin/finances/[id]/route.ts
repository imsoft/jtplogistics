import { prisma } from "@/lib/db";
import { adminHandler } from "@/lib/api-handler";
import { logAudit, diffObjects } from "@/lib/audit-log";

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

export function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminHandler(async () => {
    const { id } = await params;
    const finance = await prisma.finance.findUnique({ where: { id } });
    if (!finance) return Response.json({ error: "No encontrado" }, { status: 404 });
    return Response.json(toJson(finance));
  });
}

const FINANCE_LABELS: Record<string, string> = {
  eco: "ECO",
  client: "Cliente",
  origin: "Origen",
  destination: "Destino",
  sale: "Venta",
  product: "Producto",
  pickupDate: "Recolección",
  deliveryDate: "Entrega",
  legalName: "Razón social",
  cost: "Costo",
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
      eco, client, origin, destination, sale, product,
      pickupDate, deliveryDate, legalName, cost, operatorName,
      truck, trailer, unit, phone, comments, incident, incidentType,
    } = body as Record<string, string | null | undefined>;

    const finance = await prisma.finance.findUnique({ where: { id } });
    if (!finance) return Response.json({ error: "No encontrado" }, { status: 404 });

    const data: Record<string, unknown> = {};
    if (eco !== undefined) data.eco = (eco as string)?.trim() || null;
    if (client !== undefined) data.client = (client as string)?.trim() || null;
    if (origin !== undefined) data.origin = (origin as string)?.trim() || null;
    if (destination !== undefined) data.destination = (destination as string)?.trim() || null;
    if (sale !== undefined) {
      const parsed = sale ? parseFloat(sale) : null;
      data.sale = parsed != null && !isNaN(parsed) ? parsed : null;
    }
    if (product !== undefined) data.product = (product as string)?.trim() || null;
    if (pickupDate !== undefined) data.pickupDate = pickupDate ? new Date(pickupDate) : null;
    if (deliveryDate !== undefined) data.deliveryDate = deliveryDate ? new Date(deliveryDate) : null;
    if (legalName !== undefined) data.legalName = (legalName as string)?.trim() || null;
    if (cost !== undefined) {
      const parsed = cost ? parseFloat(cost) : null;
      data.cost = parsed != null && !isNaN(parsed) ? parsed : null;
    }
    if (operatorName !== undefined) data.operatorName = (operatorName as string)?.trim() || null;
    if (truck !== undefined) data.truck = (truck as string)?.trim() || null;
    if (trailer !== undefined) data.trailer = (trailer as string)?.trim() || null;
    if (unit !== undefined) data.unit = (unit as string)?.trim() || null;
    if (phone !== undefined) data.phone = (phone as string)?.trim() || null;
    if (comments !== undefined) data.comments = (comments as string)?.trim() || null;
    if (incident !== undefined) data.incident = (incident as string)?.trim() || null;
    if (incidentType !== undefined) data.incidentType = (incidentType as string)?.trim() || null;

    const updated = await prisma.finance.update({ where: { id }, data });

    const changes = diffObjects(
      finance as unknown as Record<string, unknown>,
      updated as unknown as Record<string, unknown>,
      FINANCE_LABELS
    );
    if (changes.length > 0) {
      void logAudit({
        resource: "finance",
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
    const finance = await prisma.finance.findUnique({ where: { id } });
    if (!finance) return Response.json({ error: "No encontrado" }, { status: 404 });
    await prisma.finance.delete({ where: { id } });
    void logAudit({
      resource: "finance",
      resourceId: id,
      resourceLabel: `${finance.eco ?? ""} – ${finance.origin ?? ""} → ${finance.destination ?? ""}`.trim(),
      action: "deleted",
      userId: session.user.id,
      userName: session.user.name,
    });
    return Response.json({ ok: true });
  });
}
