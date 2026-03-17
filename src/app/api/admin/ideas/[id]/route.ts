import { prisma } from "@/lib/db";
import { adminHandler } from "@/lib/api-handler";

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

    return Response.json({ ok: true });
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
