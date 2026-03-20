import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-server";
import { notify } from "@/lib/notify";
import { logAudit } from "@/lib/audit-log";
import type { TaskStatus } from "@/types/task.types";

const VALID_STATUSES: TaskStatus[] = ["pending", "in_progress", "completed"];

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
    await requireAdmin();
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
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();

    const description = body.description ? String(body.description).trim() : null;
    const title = body.title ? String(body.title).trim() : (description?.slice(0, 80) ?? "—");
    const status: TaskStatus = VALID_STATUSES.includes(body.status) ? body.status : "pending";

    const assigneeIdFromBody = body.assigneeId ? String(body.assigneeId).trim() : null;
    let assigneeId = assigneeIdFromBody;

    if (!assigneeId) {
      const developer = await prisma.user.findFirst({ where: { role: "developer" }, orderBy: { createdAt: "asc" } });
      if (!developer) return Response.json({ error: "No hay ningún desarrollador registrado" }, { status: 400 });
      assigneeId = developer.id;
    } else {
      const assignee = await prisma.user.findUnique({ where: { id: assigneeId } });
      if (!assignee || assignee.role !== "developer") {
        return Response.json({ error: "El usuario asignado no es un desarrollador" }, { status: 400 });
      }
    }

    const task = await prisma.task.create({
      data: { title, description, status, assigneeId, createdById: session.user.id },
      include: {
        assignee: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
    });

    void notify({
      userId: task.assigneeId,
      type: "new_task",
      title: `Nueva tarea: ${task.title.slice(0, 60)}`,
      body: task.description?.slice(0, 80) ?? undefined,
      href: `/developer/dashboard/tasks/${task.id}`,
    });

    void logAudit({
      resource: "task",
      resourceId: task.id,
      resourceLabel: task.title,
      action: "created",
      userId: session.user.id,
      userName: session.user.name,
    });

    return Response.json(taskToJson(task), { status: 201 });
  } catch (e) {
    if (e instanceof Response) throw e;
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
