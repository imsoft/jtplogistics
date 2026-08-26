import { prisma } from "@/lib/db";
import { requireDeveloper } from "@/lib/auth-server";

/** Catálogo de equipos para elegir en los formularios de mantenimiento. */
export async function GET() {
  try {
    await requireDeveloper();
    const [laptops, phones] = await Promise.all([
      prisma.laptop.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, equipmentCode: true, assignedTo: { select: { name: true } } },
      }),
      prisma.phone.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, equipmentCode: true, assignedTo: { select: { name: true } } },
      }),
    ]);
    return Response.json({ laptops, phones });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[developer/equipment] GET", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
