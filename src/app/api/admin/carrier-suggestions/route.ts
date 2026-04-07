import { prisma } from "@/lib/db";
import { adminHandler } from "@/lib/api-handler";

export function GET() {
  return adminHandler(async () => {
    const rows = await prisma.carrierSuggestion.findMany({
      orderBy: { createdAt: "desc" },
      include: { carrier: { select: { name: true, email: true } } },
    });
    return Response.json(
      rows.map((r) => ({
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
