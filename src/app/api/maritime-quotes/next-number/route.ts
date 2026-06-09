import { prisma } from "@/lib/db";
import { gateMaritime } from "@/lib/maritime-quote-auth";

export async function GET() {
  try {
    await gateMaritime("canViewMaritimeQuotes");

    const now = new Date();
    const aaaa = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, "0");

    const startOfMonth = new Date(Date.UTC(aaaa, now.getUTCMonth(), 1, 0, 0, 0, 0));
    const startOfNextMonth = new Date(Date.UTC(aaaa, now.getUTCMonth() + 1, 1, 0, 0, 0, 0));

    const count = await prisma.maritimeQuote.count({
      where: { createdAt: { gte: startOfMonth, lt: startOfNextMonth } },
    });

    const next = String(count + 1).padStart(2, "0");
    return Response.json({ reference: `${aaaa}${mm}-${next}` });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
