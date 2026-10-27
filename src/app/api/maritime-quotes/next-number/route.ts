import { prisma } from "@/lib/db";
import { gateMaritime } from "@/lib/maritime-quote-auth";
import { maritimeMonthPrefix, nextMaritimeReference } from "@/lib/maritime-reference";

export async function GET() {
  try {
    await gateMaritime("canViewMaritimeQuotes");
    const prefix = maritimeMonthPrefix();
    const used = await prisma.maritimeQuote.findMany({ where: { reference: { startsWith: `${prefix}-` } }, select: { reference: true } });
    return Response.json({ reference: nextMaritimeReference(used.map((q) => q.reference), prefix) });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
