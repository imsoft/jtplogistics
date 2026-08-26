import { prisma } from "@/lib/db";
import { requireDeveloper } from "@/lib/auth-server";

/** Todos los reportes, para quien da soporte. */
export async function GET() {
  try {
    await requireDeveloper();
    const tickets = await prisma.supportTicket.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        reporter: { select: { id: true, name: true, email: true } },
        laptop: { select: { id: true, name: true, equipmentCode: true } },
        phone: { select: { id: true, name: true, equipmentCode: true } },
        maintenances: { select: { id: true, kind: true, status: true } },
      },
    });
    return Response.json(tickets);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[developer/tickets] GET", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
