import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit-log";
import { hrHandler, requireHrAccess } from "@/lib/hr-access";
import { validateActa, type ActaData } from "@/lib/acta-administrativa";

/** GET — las últimas actas levantadas (de quien sea, menos las propias si es RH). */
export function GET() {
  return hrHandler(async () => {
    const session = await requireHrAccess();
    const rows = await prisma.administrativeRecord.findMany({
      where: session.user.role === "admin" ? {} : { OR: [{ employeeId: null }, { employeeId: { not: session.user.id } }] },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, employeeName: true, data: true, createdAt: true, createdBy: { select: { name: true } } },
    });
    return Response.json(rows.map((r) => ({ id: r.id, employeeName: r.employeeName, data: r.data, createdAt: r.createdAt, createdByName: r.createdBy?.name ?? null })));
  });
}

/** POST { employeeId?, data: ActaData } — se guarda al generar el PDF. */
export function POST(req: Request) {
  return hrHandler(async () => {
    const session = await requireHrAccess();
    const body = (await req.json().catch(() => ({}))) as { employeeId?: unknown; data?: ActaData };
    const data = body.data;
    if (!data || typeof data !== "object" || Object.keys(validateActa(data)).length) {
      return Response.json({ error: "Faltan datos del acta." }, { status: 400 });
    }
    let employeeId = typeof body.employeeId === "string" && body.employeeId ? body.employeeId : null;
    if (employeeId === session.user.id && session.user.role !== "admin") return Response.json({ error: "No puedes levantarte un acta." }, { status: 403 });
    if (employeeId && !(await prisma.user.findUnique({ where: { id: employeeId }, select: { id: true } }))) employeeId = null;

    const row = await prisma.administrativeRecord.create({
      data: { employeeId, employeeName: String(data.employeeName).trim(), data: data as object, createdById: session.user.id },
    });
    void logAudit({
      resource: "administrative_record", resourceId: row.id, resourceLabel: `Acta · ${row.employeeName}`,
      action: "created", userId: session.user.id, userName: session.user.name,
    });
    return Response.json({ id: row.id }, { status: 201 });
  });
}
