import { prisma } from "@/lib/db";
import { requireDeveloper } from "@/lib/auth-server";
import type { TaskStatus } from "@/types/task.types";

export async function GET() {
  try {
    const session = await requireDeveloper();
    const tasks = await prisma.task.findMany({
      where: { assigneeId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        assignee: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
    });
    return Response.json(
      tasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status as TaskStatus,
        assigneeId: t.assigneeId,
        assigneeName: t.assignee.name,
        createdById: t.createdById,
        createdByName: t.createdBy.name,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      }))
    );
  } catch (e) {
    if (e instanceof Response) throw e;
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
