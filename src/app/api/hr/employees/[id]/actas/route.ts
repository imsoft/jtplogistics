import { prisma } from "@/lib/db";
import { hrHandler, requireHrAccessFor } from "@/lib/hr-access";

/** GET — actas administrativas del colaborador. */
export function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return hrHandler(async () => {
    const { id } = await params;
    await requireHrAccessFor(id);
    const rows = await prisma.administrativeRecord.findMany({
      where: { employeeId: id },
      orderBy: { createdAt: "desc" },
      select: { id: true, employeeName: true, data: true, createdAt: true, createdBy: { select: { name: true } } },
    });
    return Response.json(rows.map((r) => ({ id: r.id, employeeName: r.employeeName, data: r.data, createdAt: r.createdAt, createdByName: r.createdBy?.name ?? null })));
  });
}
