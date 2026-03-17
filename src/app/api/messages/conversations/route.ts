import { getSession } from "@/lib/auth-server";
import { prisma } from "@/lib/db";

// GET /api/messages/conversations
// Solo staff (collaborator/admin): lista de todos los carriers con su último mensaje
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }

    const { role } = session.user as { role: string };
    if (role !== "admin" && role !== "collaborator") {
      return Response.json({ error: "Prohibido" }, { status: 403 });
    }

    // Todos los carriers
    const carriers = await prisma.user.findMany({
      where: { role: "carrier" },
      select: { id: true, name: true, image: true },
      orderBy: { name: "asc" },
    });

    // Último mensaje de cada carrier
    const lastMessages = await prisma.message.findMany({
      where: { carrierId: { in: carriers.map((c) => c.id) } },
      orderBy: { createdAt: "desc" },
      distinct: ["carrierId"],
      select: {
        carrierId: true,
        body: true,
        senderRole: true,
        senderName: true,
        createdAt: true,
      },
    });

    const lastMsgMap = new Map(lastMessages.map((m) => [m.carrierId, m]));

    return Response.json(
      carriers.map((carrier) => {
        const last = lastMsgMap.get(carrier.id);
        return {
          carrierId: carrier.id,
          carrierName: carrier.name,
          carrierImage: carrier.image ?? null,
          lastMessage: last
            ? {
                body: last.body,
                senderRole: last.senderRole,
                senderName: last.senderName,
                createdAt: last.createdAt.toISOString(),
              }
            : null,
        };
      })
    );
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
