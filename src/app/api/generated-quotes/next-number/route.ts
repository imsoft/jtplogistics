import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth-server";

export async function GET() {
  try {
    await requireSession();

    const year = new Date().getFullYear();
    const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);

    const count = await prisma.generatedQuote.count({
      where: { createdAt: { gte: startOfYear } },
    });

    const next = String(count + 1).padStart(3, "0");
    return Response.json({ quoteNumber: `JTP-${year}-${next}` });
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
