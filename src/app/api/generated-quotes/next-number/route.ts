import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth-server";

export async function GET() {
  try {
    await requireSession();

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const dd = pad(now.getDate());
    const mm = pad(now.getMonth() + 1);
    const aaaa = now.getFullYear();

    const startOfDay = new Date(`${aaaa}-${mm}-${dd}T00:00:00.000Z`);
    const endOfDay   = new Date(`${aaaa}-${mm}-${dd}T23:59:59.999Z`);

    const count = await prisma.generatedQuote.count({
      where: { createdAt: { gte: startOfDay, lte: endOfDay } },
    });

    const next = String(count + 1).padStart(3, "0");
    return Response.json({ quoteNumber: `JTP-${dd}${mm}${aaaa}-${next}` });
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
