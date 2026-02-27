import { prisma } from "@/lib/db";
import { adminHandler } from "@/lib/api-handler";

export function GET() {
  return adminHandler(async () => {
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
  });
}

export function POST(request: Request) {
  return adminHandler(async () => {
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
  });
}
