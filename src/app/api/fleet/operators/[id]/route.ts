import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit-log";
import { readOperatorBody } from "@/lib/carrier-fleet";
import { fleetFailure, requireFleetAccess } from "@/lib/carrier-fleet-server";

async function load(id: string) {
  return prisma.carrierOperator.findUnique({ where: { id } });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const current = await load(id);
    if (!current) return Response.json({ error: "No encontrado" }, { status: 404 });
    // El acceso se revisa contra el dueño real del registro, no contra lo que mande el cuerpo.
    const access = await requireFleetAccess(current.carrierId, "edit");
    if (access.carrierId !== current.carrierId) return Response.json({ error: "No encontrado" }, { status: 404 });
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    // Lo que no venga en el cuerpo se queda como estaba (cambio parcial).
    const merged = { ...(current as unknown as Record<string, unknown>), ...body };
    const parsed = readOperatorBody(merged);
    if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
    await prisma.carrierOperator.update({ where: { id }, data: parsed.data });
    void logAudit({ resource: "fleet_operator", resourceId: id, resourceLabel: `Operador ${parsed.data.name}`, action: "updated", userId: access.userId, userName: access.userName });
    return Response.json({ ok: true });
  } catch (e) {
    return fleetFailure(e, "operators PATCH");
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const current = await load(id);
    if (!current) return Response.json({ error: "No encontrado" }, { status: 404 });
    const access = await requireFleetAccess(current.carrierId, "edit");
    if (access.carrierId !== current.carrierId) return Response.json({ error: "No encontrado" }, { status: 404 });
    await prisma.carrierOperator.delete({ where: { id } });
    void logAudit({ resource: "fleet_operator", resourceId: id, resourceLabel: `Operador ${current.name}`, action: "deleted", userId: access.userId, userName: access.userName });
    return Response.json({ ok: true });
  } catch (e) {
    return fleetFailure(e, "operators DELETE");
  }
}
