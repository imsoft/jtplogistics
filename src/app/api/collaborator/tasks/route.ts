import { prisma } from "@/lib/db";
import { requireCollaboratorOrAdmin } from "@/lib/auth-server";
import type { TaskStatus } from "@/types/task.types";

function taskToJson(t: {
  id: string;
  title: string;
  description: string | null;
  status: string;
  assigneeId: string;
  assignee: { name: string };
  createdById: string;
  createdBy: { name: string };
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
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
  };
}

export async function GET() {
  try {
    const session = await requireCollaboratorOrAdmin();

    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { canViewTasks: true },
    });

    if (!me?.canViewTasks) {
      return Response.json({ error: "Sin permiso" }, { status: 403 });
    }

    const tasks = await prisma.task.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        assignee: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
    });

    return Response.json(tasks.map(taskToJson));
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
