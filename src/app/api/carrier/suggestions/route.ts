import { prisma } from "@/lib/db";
import { carrierHandler } from "@/lib/api-handler";
import { notifyRole } from "@/lib/notify";
import { logAudit } from "@/lib/audit-log";

function toJson(s: {
  id: string;
  title: string;
  description: string | null;
  status: string;
  carrierId: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: s.id,
    title: s.title,
    description: s.description,
    status: s.status,
    carrierId: s.carrierId,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

export function GET() {
  return carrierHandler(async (session) => {
    const rows = await prisma.carrierSuggestion.findMany({
      where: { carrierId: session.user.id },
      orderBy: { createdAt: "desc" },
    });
    return Response.json(rows.map(toJson));
  });
}

export function POST(request: Request) {
  return carrierHandler(async (session) => {
    const body = await request.json();
    const { title, description } = body as { title?: string; description?: string };

    if (!title?.trim()) {
      return Response.json({ error: "El título es obligatorio" }, { status: 400 });
    }

    const row = await prisma.carrierSuggestion.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        carrierId: session.user.id,
      },
    });

    void notifyRole("admin", {
      type: "carrier_suggestion",
      title: `Nueva sugerencia: ${row.title.slice(0, 55)}`,
      body: row.description?.slice(0, 100) ?? undefined,
      href: `/admin/dashboard/carrier-suggestions/${row.id}`,
    });

    void logAudit({
      resource: "carrier_suggestion",
      resourceId: row.id,
      resourceLabel: row.title,
      action: "created",
      userId: session.user.id,
      userName: session.user.name,
    });

    return Response.json({ id: row.id }, { status: 201 });
  });
}
