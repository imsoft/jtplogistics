import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth-server";

const PUBLIC_KEYS = ["jtp_whatsapp"];

export async function GET() {
  try {
    await requireSession();
    const settings = await prisma.setting.findMany({
      where: { key: { in: PUBLIC_KEYS } },
    });
    const map: Record<string, string> = {};
    for (const s of settings) map[s.key] = s.value;
    return Response.json(map);
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
