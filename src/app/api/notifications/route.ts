import { getSession } from "@/lib/auth-server";
import { prisma } from "@/lib/db";

// GET /api/notifications — últimas 30 del usuario actual
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "No autorizado" }, { status: 401 });

    const notifications = await prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        href: true,
        read: true,
        createdAt: true,
      },
    });

    return Response.json(
      notifications.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() }))
    );
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

// PATCH /api/notifications — marcar todas como leídas (o ids específicas)
// body: { ids?: string[] }  — si se omite, marca todas
export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "No autorizado" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const ids: string[] | undefined = Array.isArray(body.ids) ? body.ids : undefined;

    await prisma.notification.updateMany({
      where: {
        userId: session.user.id,
        ...(ids ? { id: { in: ids } } : {}),
      },
      data: { read: true },
    });

    return Response.json({ ok: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
