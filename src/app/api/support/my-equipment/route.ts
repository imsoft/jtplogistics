import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth-server";

/** Equipos asignados a quien pregunta, para señalar cuál falla al reportar. */
export async function GET() {
  try {
    const session = await requireSession();
    const [laptops, phones] = await Promise.all([
      prisma.laptop.findMany({
        where: { assignedToId: session.user.id },
        orderBy: { name: "asc" },
        select: { id: true, name: true, equipmentCode: true },
      }),
      prisma.phone.findMany({
        where: { assignedToId: session.user.id },
        orderBy: { name: "asc" },
        select: { id: true, name: true, equipmentCode: true },
      }),
    ]);
    return Response.json({ laptops, phones });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[support/my-equipment] GET", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
