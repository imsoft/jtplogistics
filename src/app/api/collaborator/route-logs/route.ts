import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireCollaboratorOrAdmin } from "@/lib/auth-server";

export async function GET(request: NextRequest) {
  try {
    const session = await requireCollaboratorOrAdmin();

    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { canViewRouteLogs: true },
    });

    if (!me?.canViewRouteLogs) {
      return Response.json({ error: "Sin permiso" }, { status: 403 });
    }

    const routeId = request.nextUrl.searchParams.get("routeId") ?? undefined;
    const skip = Number(request.nextUrl.searchParams.get("skip") ?? "0");
    const take = Math.min(Number(request.nextUrl.searchParams.get("take") ?? "50"), 100);

    const [logs, total] = await Promise.all([
      prisma.routeLog.findMany({
        where: routeId ? { routeId } : undefined,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.routeLog.count({
        where: routeId ? { routeId } : undefined,
      }),
    ]);

    return Response.json({
      total,
      logs: logs.map((l) => ({
        id: l.id,
        routeId: l.routeId,
        routeLabel: l.routeLabel,
        action: l.action,
        userId: l.userId,
        userName: l.userName,
        changes: l.changes ? JSON.parse(l.changes) : null,
        snapshot: l.snapshot ? JSON.parse(l.snapshot) : null,
        createdAt: l.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
