import { prisma } from "@/lib/db";
import { adminHandler } from "@/lib/api-handler";

export function GET() {
  return adminHandler(async () => {
    const rows = await prisma.carrierSuggestion.findMany({
      orderBy: { createdAt: "desc" },
      include: { carrier: { select: { name: true, email: true } } },
    });
    type Row = {
      id: string;
      title: string;
      description: string | null;
      status: string;
      carrierId: string;
      carrier: { name: string; email: string };
      createdAt: Date;
      updatedAt: Date;
    };
    return Response.json(
      (rows as Row[]).map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        status: r.status,
        carrierId: r.carrierId,
        carrierName: r.carrier.name,
        carrierEmail: r.carrier.email,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }))
    );
  });
}
