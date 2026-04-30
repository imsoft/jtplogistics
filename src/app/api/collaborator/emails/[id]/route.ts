import { prisma } from "@/lib/db";
import { requireCollaboratorOrAdmin } from "@/lib/auth-server";

async function checkPermission(userId: string) {
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      canViewEmails: true,
      canUpdateEmails: true,
      canDeleteEmails: true,
    },
  });
  return {
    canRead: Boolean(me?.canViewEmails),
    canUpdate: Boolean(me?.canUpdateEmails),
    canDelete: Boolean(me?.canDeleteEmails),
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireCollaboratorOrAdmin();
    const permission = await checkPermission(session.user.id);
    if (!permission.canRead) {
      return Response.json({ error: "Sin permiso" }, { status: 403 });
    }

    const { id } = await params;
    const account = await prisma.emailAccount.findUnique({
      where: { id },
      include: {
        assignees: { include: { user: { select: { id: true, name: true } } } },
      },
    });
    if (!account) return Response.json({ error: "No encontrado" }, { status: 404 });
    return Response.json({
      id: account.id,
      type: account.type,
      email: account.email,
      password: account.password,
      assignees: account.assignees.map((a) => ({ id: a.user.id, name: a.user.name })),
      createdAt: account.createdAt.toISOString(),
    });
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireCollaboratorOrAdmin();
    const permission = await checkPermission(session.user.id);
    if (!permission.canUpdate) {
      return Response.json({ error: "Sin permiso" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { type, email, password, assigneeIds } = body as {
      type?: string;
      email?: string;
      password?: string;
      assigneeIds?: string[];
    };

    const account = await prisma.emailAccount.findUnique({ where: { id } });
    if (!account) return Response.json({ error: "No encontrado" }, { status: 404 });

    await prisma.emailAccount.update({
      where: { id },
      data: {
        ...(type !== undefined && { type }),
        ...(email !== undefined && { email }),
        ...(password !== undefined && { password: password || null }),
      },
    });

    if (assigneeIds !== undefined) {
      await prisma.emailAccountUser.deleteMany({ where: { emailAccountId: id } });
      if (assigneeIds.length > 0) {
        await prisma.emailAccountUser.createMany({
          data: assigneeIds.map((userId) => ({ emailAccountId: id, userId })),
        });
      }
    }

    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireCollaboratorOrAdmin();
    const permission = await checkPermission(session.user.id);
    if (!permission.canDelete) {
      return Response.json({ error: "Sin permiso" }, { status: 403 });
    }

    const { id } = await params;
    const account = await prisma.emailAccount.findUnique({ where: { id } });
    if (!account) return Response.json({ error: "No encontrado" }, { status: 404 });
    await prisma.emailAccount.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
