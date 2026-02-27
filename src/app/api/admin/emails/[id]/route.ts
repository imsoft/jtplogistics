import { prisma } from "@/lib/db";
import { adminHandler } from "@/lib/api-handler";

export function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminHandler(async () => {
    const { id } = await params;
    const account = await prisma.emailAccount.findUnique({
      where: { id },
      include: {
        assignees: { include: { user: { select: { id: true, name: true } } } },
      },
    });
    if (!account) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({
      id: account.id,
      type: account.type,
      email: account.email,
      password: account.password,
      assignees: account.assignees.map((a) => ({ id: a.user.id, name: a.user.name })),
      createdAt: account.createdAt.toISOString(),
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
    const { type, email, password, assigneeIds } = body as {
      type?: string;
      email?: string;
      password?: string;
      assigneeIds?: string[];
    };

    const account = await prisma.emailAccount.findUnique({ where: { id } });
    if (!account) return Response.json({ error: "Not found" }, { status: 404 });

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
  });
}

export function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminHandler(async () => {
    const { id } = await params;
    const account = await prisma.emailAccount.findUnique({ where: { id } });
    if (!account) return Response.json({ error: "Not found" }, { status: 404 });
    await prisma.emailAccount.delete({ where: { id } });
    return Response.json({ ok: true });
  });
}
