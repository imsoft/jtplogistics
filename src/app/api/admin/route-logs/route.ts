import { NextRequest } from "next/server";
import { readPaging } from "@/lib/paging";
import { prisma } from "@/lib/db";
import { adminHandler } from "@/lib/api-handler";

// GET /api/admin/route-logs?routeId=xxx&skip=0&take=50
export function GET(request: NextRequest) {
  return adminHandler(async () => {
    const routeId = request.nextUrl.searchParams.get("routeId") ?? undefined;
    const { skip, take } = readPaging(request.nextUrl.searchParams);

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
  });
}
