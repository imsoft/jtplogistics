import { prisma } from "@/lib/db";
import { adminHandler } from "@/lib/api-handler";
import { requireAdmin } from "@/lib/auth-server";
import { notify } from "@/lib/notify";

export function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminHandler(async () => {
    const { id } = await params;
    const idea = await prisma.idea.findUnique({
      where: { id },
      include: { author: { select: { name: true } } },
    });
    if (!idea) return Response.json({ error: "No encontrado" }, { status: 404 });
    return Response.json({
      id: idea.id,
      title: idea.title,
      description: idea.description,
      category: idea.category,
      status: idea.status,
      authorId: idea.authorId,
      authorName: idea.author.name,
      createdAt: idea.createdAt.toISOString(),
      updatedAt: idea.updatedAt.toISOString(),
    });
  });
}

export function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminHandler(async () => {
    const session = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const { title, description, category, status } = body as {
      title?: string;
      description?: string;
      category?: string;
      status?: string;
    };

    const idea = await prisma.idea.findUnique({ where: { id } });
    if (!idea) return Response.json({ error: "No encontrado" }, { status: 404 });

    const VALID_STATUSES = ["pending", "accepted", "rejected"];
    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return Response.json({ error: "Estado inválido" }, { status: 400 });
    }

    await prisma.idea.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(category !== undefined && { category: category?.trim() || null }),
        ...(status !== undefined && { status }),
      },
    });

    // Si se acepta, crear tarea automáticamente
    let taskId: string | null = null;
    if (status === "accepted") {
      const ideaTitle = title?.trim() ?? idea.title;
      const ideaDescription = description !== undefined
        ? (description?.trim() || null)
        : (idea.description ?? null);

      // Asignar al primer developer disponible
      const developer = await prisma.user.findFirst({
        where: { role: "developer" },
        orderBy: { createdAt: "asc" },
      });

      if (developer) {
        const task = await prisma.task.create({
          data: {
            title: ideaTitle,
            description: ideaDescription,
            status: "pending",
            assigneeId: developer.id,
            createdById: session.user.id,
          },
        });
        taskId = task.id;
      }
    }

    // Notificar al autor si se acepta o rechaza
    if (status === "accepted" || status === "rejected") {
      const label = status === "accepted" ? "aceptada ✓" : "rechazada";
      void notify({
        userId: idea.authorId,
        type: `idea_${status}`,
        title: `Tu idea fue ${label}`,
        body: idea.title.slice(0, 80),
        href: `/collaborator/dashboard/ideas`,
      });
    }

    return Response.json({ ok: true, taskId });
  });
}

export function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminHandler(async () => {
    const { id } = await params;
    const idea = await prisma.idea.findUnique({ where: { id } });
    if (!idea) return Response.json({ error: "No encontrado" }, { status: 404 });
    await prisma.idea.delete({ where: { id } });
    return Response.json({ ok: true });
  });
}
