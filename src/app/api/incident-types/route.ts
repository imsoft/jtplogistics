import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth-server";
import { incidentTypeDefOrderBy } from "@/lib/prisma/incident-type-order";

export async function GET() {
  try {
    await requireSession();
    const types = await prisma.incidentTypeDef.findMany({ orderBy: incidentTypeDefOrderBy });
    return Response.json(types.map((t) => ({ value: t.value, label: t.name })));
  } catch (e) {
    if (e instanceof Response) throw e;
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
