import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireDeveloper } from "@/lib/auth-server";
import type { TaskStatus } from "@/types/task.types";

const VALID_STATUSES: TaskStatus[] = ["pending", "in_progress", "completed"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireDeveloper();
    const { id } = await params;
    const body = await request.json();

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return Response.json({ error: "No encontrado" }, { status: 404 });
    if (task.assigneeId !== session.user.id) {
      return Response.json({ error: "No autorizado" }, { status: 403 });
    }
    if (!VALID_STATUSES.includes(body.status)) {
      return Response.json({ error: "Estado inválido" }, { status: 400 });
    }

    const updated = await prisma.task.update({
      where: { id },
      data: { status: body.status },
      include: {
        assignee: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
    });

    return Response.json({
      id: updated.id,
      title: updated.title,
      description: updated.description,
      status: updated.status as TaskStatus,
      assigneeId: updated.assigneeId,
      assigneeName: updated.assignee.name,
      createdById: updated.createdById,
      createdByName: updated.createdBy.name,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (e) {
    if (e instanceof Response) throw e;
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
