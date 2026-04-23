import { prisma } from "@/lib/db";
import { adminHandler } from "@/lib/api-handler";

export interface ShipmentTimelineEntry {
  status: string;
  from: string | null;
  at: string;
  by: string;
}

export function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminHandler(async () => {
    const { id } = await params;

    const [shipment, logs] = await Promise.all([
      prisma.shipment.findUnique({
        where: { id },
        select: { status: true, createdAt: true },
      }),
      prisma.auditLog.findMany({
        where: { resource: "shipment", resourceId: id },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    if (!shipment) return Response.json({ error: "No encontrado" }, { status: 404 });

    // Reconstruir la secuencia de estados desde los audit logs
    const statusChanges: { from: string | null; to: string | null; at: string; by: string }[] = [];
    let createdAt: string | null = null;
    let createdBy: string | null = null;

    for (const log of logs) {
      if (log.action === "created") {
        createdAt = log.createdAt.toISOString();
        createdBy = log.userName;
      } else if (log.action === "updated" && log.changes) {
        const changes = JSON.parse(log.changes) as { field: string; from: string | null; to: string | null }[];
        const sc = changes.find((c) => c.field === "status");
        if (sc) {
          statusChanges.push({ from: sc.from, to: sc.to, at: log.createdAt.toISOString(), by: log.userName });
        }
      }
    }

    // Estado inicial: si hay cambios usamos el `from` del primero; si no, el estado actual del embarque
    const initialStatus = statusChanges.length > 0 ? statusChanges[0].from : shipment.status;
    const initialAt = createdAt ?? shipment.createdAt.toISOString();
    const initialBy = createdBy ?? "Sistema";

    const timeline: ShipmentTimelineEntry[] = [
      { status: initialStatus ?? "pending", from: null, at: initialAt, by: initialBy },
      ...statusChanges.map((sc) => ({ status: sc.to ?? shipment.status, from: sc.from, at: sc.at, by: sc.by })),
    ];

    return Response.json(timeline);
  });
}
