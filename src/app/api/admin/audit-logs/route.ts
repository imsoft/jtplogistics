import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { adminHandler } from "@/lib/api-handler";

// GET /api/admin/audit-logs?resource=xxx&skip=0&take=50
export function GET(request: NextRequest) {
  return adminHandler(async () => {
    const resource = request.nextUrl.searchParams.get("resource") ?? undefined;
    const skip = Number(request.nextUrl.searchParams.get("skip") ?? "0");
    const take = Math.min(Number(request.nextUrl.searchParams.get("take") ?? "50"), 100);

    const where = resource ? { resource } : undefined;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return Response.json({
      total,
      logs: logs.map((l) => ({
        id: l.id,
        resource: l.resource,
        resourceId: l.resourceId,
        resourceLabel: l.resourceLabel,
        action: l.action,
        userId: l.userId,
        userName: l.userName,
        changes: l.changes ? JSON.parse(l.changes) : null,
        createdAt: l.createdAt.toISOString(),
      })),
    });
  });
}
