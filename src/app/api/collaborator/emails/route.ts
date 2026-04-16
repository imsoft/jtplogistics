import { prisma } from "@/lib/db";
import { requireCollaboratorOrAdmin } from "@/lib/auth-server";

export async function GET() {
  try {
    const session = await requireCollaboratorOrAdmin();

    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { canViewEmails: true },
    });

    if (!me?.canViewEmails) {
      return Response.json({ error: "Sin permiso" }, { status: 403 });
    }

    const emails = await prisma.emailAccount.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        assignees: { include: { user: { select: { id: true, name: true } } } },
      },
    });

    return Response.json(
      emails.map((e) => ({
        id: e.id,
        type: e.type,
        email: e.email,
        password: e.password,
        assignees: e.assignees.map((a) => ({ id: a.user.id, name: a.user.name })),
        createdAt: e.createdAt.toISOString(),
      }))
    );
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireCollaboratorOrAdmin();

    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { canViewEmails: true },
    });

    if (!me?.canViewEmails) {
      return Response.json({ error: "Sin permiso" }, { status: 403 });
    }

    const body = await request.json();
    const { type, email, password, assigneeIds } = body as {
      type: string;
      email: string;
      password?: string;
      assigneeIds?: string[];
    };

    if (!type || !email) {
      return Response.json({ error: "type y email son requeridos" }, { status: 400 });
    }

    const account = await prisma.emailAccount.create({
      data: {
        type,
        email,
        password: password || null,
        assignees: assigneeIds?.length
          ? { create: assigneeIds.map((userId) => ({ userId })) }
          : undefined,
      },
    });

    return Response.json({ id: account.id }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
