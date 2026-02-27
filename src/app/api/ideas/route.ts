import { prisma } from "@/lib/db";
import { ideasHandler } from "@/lib/api-handler";

export function GET() {
  return ideasHandler(async () => {
    const ideas = await prisma.idea.findMany({
      orderBy: { createdAt: "desc" },
      include: { author: { select: { name: true } } },
    });
    return Response.json(
      ideas.map((idea) => ({
        id: idea.id,
        title: idea.title,
        description: idea.description,
        category: idea.category,
        authorId: idea.authorId,
        authorName: idea.author.name,
        createdAt: idea.createdAt.toISOString(),
        updatedAt: idea.updatedAt.toISOString(),
      }))
    );
  });
}

export function POST(request: Request) {
  return ideasHandler(async (session) => {
    const body = await request.json();
    const { title, description, category } = body as {
      title: string;
      description?: string;
      category?: string;
    };

    if (!title?.trim()) {
      return Response.json({ error: "El título es requerido" }, { status: 400 });
    }

    const idea = await prisma.idea.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        category: category?.trim() || null,
        authorId: session.user.id,
      },
    });

    return Response.json({ id: idea.id }, { status: 201 });
  });
}
