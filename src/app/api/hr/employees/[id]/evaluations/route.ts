import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit-log";
import { hrHandler, requireHrAccessFor } from "@/lib/hr-access";

/** GET — evaluaciones del colaborador, de la más reciente a la más vieja. */
export function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return hrHandler(async () => {
    const { id } = await params;
    await requireHrAccessFor(id);
    const rows = await prisma.employeeEvaluation.findMany({
      where: { employeeId: id },
      orderBy: [{ period: "desc" }, { createdAt: "desc" }],
      select: { id: true, period: true, stars: true, comment: true, createdAt: true, evaluatedBy: { select: { name: true } } },
    });
    return Response.json(rows.map((r) => ({ ...r, evaluatedByName: r.evaluatedBy?.name ?? null, evaluatedBy: undefined })));
  });
}

/** POST { period: "AAAA-MM", stars: 1–5 en medias, comment? } */
export function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return hrHandler(async () => {
    const { id } = await params;
    const session = await requireHrAccessFor(id);
    const body = (await req.json().catch(() => ({}))) as { period?: unknown; stars?: unknown; comment?: unknown };
    const period = typeof body.period === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(body.period) ? body.period : null;
    const stars = typeof body.stars === "number" && body.stars >= 1 && body.stars <= 5 && Number.isInteger(body.stars * 2) ? body.stars : null;
    const comment = typeof body.comment === "string" ? body.comment.trim().slice(0, 4000) || null : null;
    if (!period) return Response.json({ error: "Elige el mes que se evalúa." }, { status: 400 });
    if (!stars) return Response.json({ error: "Elige la calificación (de 1 a 5 estrellas)." }, { status: 400 });
    const employee = await prisma.user.findUnique({ where: { id }, select: { name: true, role: true } });
    if (!employee || employee.role !== "collaborator") return Response.json({ error: "No encontrado" }, { status: 404 });

    const row = await prisma.employeeEvaluation.create({ data: { employeeId: id, period, stars, comment, evaluatedById: session.user.id } });
    void logAudit({
      resource: "employee_evaluation", resourceId: row.id, resourceLabel: `${employee.name} · ${period}`,
      action: "created", userId: session.user.id, userName: session.user.name,
      changes: [{ field: "stars", label: "Calificación", from: null, to: String(stars) }],
    });
    return Response.json({ id: row.id }, { status: 201 });
  });
}
