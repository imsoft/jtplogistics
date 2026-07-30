import { prisma } from "@/lib/db";
import { muralHandler } from "@/lib/mural-auth";
import { broadcastMural } from "@/lib/mural-notify";
import { logAudit, diffObjects } from "@/lib/audit-log";
import { serializePost } from "@/lib/mural";
import type { Prisma } from "@prisma/client";

const INCLUDE = { author: { select: { name: true } } } satisfies Prisma.MuralPostInclude;

const FIELD_LABELS: Record<string, string> = {
  title: "Título",
  excerpt: "Resumen",
  published: "Publicado",
};

export function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return muralHandler("canViewMural", async (session) => {
    const { id } = await params;
    const post = await prisma.muralPost.findUnique({ where: { id }, include: INCLUDE });
    if (!post) return Response.json({ error: "No encontrado" }, { status: 404 });

    if (!post.published && session.user.role === "collaborator") {
      const me = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { canCreateMural: true, canUpdateMural: true },
      });
      if (!me?.canCreateMural && !me?.canUpdateMural) {
        return Response.json({ error: "No encontrado" }, { status: 404 });
      }
    }

    return Response.json(serializePost(post));
  });
}

export function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return muralHandler("canUpdateMural", async (session) => {
    const { id } = await params;
    const current = await prisma.muralPost.findUnique({ where: { id } });
    if (!current) return Response.json({ error: "No encontrado" }, { status: 404 });

    const body = (await request.json()) as Record<string, unknown>;
    const data: Prisma.MuralPostUpdateInput = {};

    if (body.title !== undefined) {
      if (typeof body.title !== "string" || !body.title.trim()) {
        return Response.json({ error: "El título es requerido" }, { status: 400 });
      }
      data.title = body.title.trim();
    }
    if (body.excerpt !== undefined) {
      data.excerpt =
        typeof body.excerpt === "string" && body.excerpt.trim() ? body.excerpt.trim() : null;
    }
    if (body.contentJson !== undefined && typeof body.contentJson === "string") {
      data.contentJson = body.contentJson;
    }
    if (body.coverUrl !== undefined) {
      data.coverUrl = typeof body.coverUrl === "string" && body.coverUrl ? body.coverUrl : null;
      data.coverPublicId =
        typeof body.coverPublicId === "string" && body.coverPublicId ? body.coverPublicId : null;
    }

    // Solo se avisa cuando el borrador pasa a publicado por primera vez.
    const nowPublished = body.published === true && !current.published;
    if (body.published !== undefined) {
      data.published = body.published === true;
      if (nowPublished) data.publishedAt = new Date();
    }

    const post = await prisma.muralPost.update({ where: { id }, data, include: INCLUDE });

    if (nowPublished) {
      void broadcastMural({
        type: "mural_post",
        title: `Nueva publicación: ${post.title}`,
        body: post.excerpt ?? undefined,
        path: `/dashboard/mural/posts/${post.id}`,
        sendEmail: body.notifyByEmail !== false,
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
      action: "updated",
      userId: session.user.id,
      userName: session.user.name,
      changes: diffObjects(current, post, FIELD_LABELS),
    });

    return Response.json(serializePost(post));
  });
}

export function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return muralHandler("canDeleteMural", async (session) => {
    const { id } = await params;
    const post = await prisma.muralPost.findUnique({ where: { id } });
    if (!post) return Response.json({ error: "No encontrado" }, { status: 404 });

    await prisma.muralPost.delete({ where: { id } });

    void logAudit({
      resource: "mural_post",
      resourceId: post.id,
      resourceLabel: post.title,
      action: "deleted",
      userId: session.user.id,
      userName: session.user.name,
    });

    return Response.json({ ok: true });
  });
}
