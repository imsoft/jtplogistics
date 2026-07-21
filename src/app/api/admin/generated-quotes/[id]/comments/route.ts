import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth-server";

// GET: obtener comentarios de una cotización
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const comments = await prisma.quoteComment.findMany({
      where: { quoteId: id },
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return Response.json({
      comments: comments.map((c) => ({
        id: c.id,
        comment: c.comment,
        createdAt: c.createdAt.toISOString(),
        user: c.user,
      })),
    });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("Error al obtener comentarios:", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// POST: agregar comentario a una cotización
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const { comment } = await request.json();

    if (!comment || typeof comment !== "string" || comment.trim().length === 0) {
      return Response.json(
        { error: "El comentario no puede estar vacío" },
        { status: 400 }
      );
    }

    const quote = await prisma.generatedQuote.findUnique({
      where: { id },
    });

    if (!quote) {
      return Response.json({ error: "Cotización no encontrada" }, { status: 404 });
    }

    const newComment = await prisma.quoteComment.create({
      data: {
        quoteId: id,
        userId: session.user.id,
        comment: comment.trim(),
      },
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    return Response.json({
      id: newComment.id,
      comment: newComment.comment,
      createdAt: newComment.createdAt.toISOString(),
      user: newComment.user,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("Error al agregar comentario:", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
