import { prisma } from "@/lib/db";
import { muralHandler } from "@/lib/mural-auth";
import { broadcastMural } from "@/lib/mural-notify";
import { logAudit } from "@/lib/audit-log";
import { serializePost } from "@/lib/mural";
import type { Prisma } from "@prisma/client";

const INCLUDE = { author: { select: { name: true } } } satisfies Prisma.MuralPostInclude;

export function GET(request: Request) {
  return muralHandler("canViewMural", async (session) => {
    const { searchParams } = new URL(request.url);
    const limitParam = Number(searchParams.get("limit"));
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 100) : undefined;

    // Los borradores solo los ve quien puede editar el mural.
    const canSeeDrafts =
      session.user.role === "admin" ||
      (await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { canCreateMural: true, canUpdateMural: true },
      }).then((u) => Boolean(u?.canCreateMural || u?.canUpdateMural)));

    const posts = await prisma.muralPost.findMany({
      where: canSeeDrafts ? {} : { published: true },
      orderBy: [{ published: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
      take: limit,
      include: INCLUDE,
    });

    return Response.json(posts.map(serializePost));
  });
}

export function POST(request: Request) {
  return muralHandler("canCreateMural", async (session) => {
    const body = (await request.json()) as Record<string, unknown>;
    const { title, excerpt, contentJson, coverUrl, coverPublicId, published, notifyByEmail } = body;

    if (typeof title !== "string" || !title.trim()) {
      return Response.json({ error: "El título es requerido" }, { status: 400 });
    }

    const isPublished = published === true;

    const post = await prisma.muralPost.create({
      data: {
        title: title.trim(),
        excerpt: typeof excerpt === "string" && excerpt.trim() ? excerpt.trim() : null,
        contentJson: typeof contentJson === "string" ? contentJson : "",
        coverUrl: typeof coverUrl === "string" && coverUrl ? coverUrl : null,
        coverPublicId: typeof coverPublicId === "string" && coverPublicId ? coverPublicId : null,
        published: isPublished,
        publishedAt: isPublished ? new Date() : null,
        authorId: session.user.id,
      },
      include: INCLUDE,
    });

    if (isPublished) {
      void broadcastMural({
        type: "mural_post",
        title: `Nueva publicación: ${post.title}`,
        body: post.excerpt ?? undefined,
        path: `/dashboard/mural/posts/${post.id}`,
        sendEmail: notifyByEmail !== false,
        emailSubject: `Mural JTP · ${post.title}`,
        emailHeading: post.title,
        emailParagraphs: [
          "Se publicó una nueva noticia en el mural de JTP Logistics.",
          ...(post.excerpt ? [post.excerpt] : []),
        ],
        emailCta: "Leer la publicación",
        excludeUserId: session.user.id,
      });
    }

    void logAudit({
      resource: "mural_post",
      resourceId: post.id,
      resourceLabel: post.title,
      action: "created",
      userId: session.user.id,
      userName: session.user.name,
    });

    return Response.json(serializePost(post), { status: 201 });
  });
}
