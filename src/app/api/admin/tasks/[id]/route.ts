import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-server";
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    const data: Record<string, unknown> = {};
    if (body.description != null) {
      const desc = String(body.description).trim() || null;
      data.description = desc;
      data.title = body.title ? String(body.title).trim() : (desc?.slice(0, 80) ?? "—");
    } else if (body.title != null) {
      data.title = String(body.title).trim();
    }
    if (VALID_STATUSES.includes(body.status)) data.status = body.status;
    if (body.assigneeId != null) {
      const assignee = await prisma.user.findUnique({ where: { id: body.assigneeId } });
      if (!assignee || assignee.role !== "developer") {
        return Response.json({ error: "El usuario asignado no es un desarrollador" }, { status: 400 });
      }
      data.assigneeId = body.assigneeId;
    }

    const task = await prisma.task.update({
      where: { id },
      data,
      include: {
        assignee: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
    });
    return Response.json(taskToJson(task));
  } catch (e) {
    if (e instanceof Response) throw e;
    if (e && typeof e === "object" && "code" in e && e.code === "P2025") {
      return Response.json({ error: "No encontrado" }, { status: 404 });
    }
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    await prisma.task.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (e) {
    if (e instanceof Response) throw e;
    if (e && typeof e === "object" && "code" in e && e.code === "P2025") {
      return Response.json({ error: "No encontrado" }, { status: 404 });
    }
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
