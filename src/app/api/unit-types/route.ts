import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth-server";

export async function GET() {
  try {
    await requireSession();
    const types = await prisma.unitTypeDef.findMany({ orderBy: { createdAt: "asc" } });
    return Response.json(types.map((u) => ({ value: u.value, label: u.name })));
  } catch (e) {
    if (e instanceof Response) throw e;
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
