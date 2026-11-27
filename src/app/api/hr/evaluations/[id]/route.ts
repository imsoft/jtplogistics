import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit-log";
import { hrHandler, requireHrAccessFor } from "@/lib/hr-access";

/** DELETE — quita una evaluación. */
export function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return hrHandler(async () => {
    const { id } = await params;
    const row = await prisma.employeeEvaluation.findUnique({ where: { id }, select: { employeeId: true, period: true, employee: { select: { name: true } } } });
    if (!row) return Response.json({ error: "No encontrado" }, { status: 404 });
    const session = await requireHrAccessFor(row.employeeId);
    await prisma.employeeEvaluation.delete({ where: { id } });
    void logAudit({
      resource: "employee_evaluation", resourceId: id, resourceLabel: `${row.employee.name} · ${row.period}`,
      action: "deleted", userId: session.user.id, userName: session.user.name,
    });
    return Response.json({ ok: true });
  });
}
