import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth-server";

import { INSTRUCTION_CONTACT_NAME, INSTRUCTION_CONTACT_PHONE } from "@/lib/instruction-contact";

const PUBLIC_KEYS = ["jtp_whatsapp", "cover_image_url", INSTRUCTION_CONTACT_NAME, INSTRUCTION_CONTACT_PHONE];

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
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
