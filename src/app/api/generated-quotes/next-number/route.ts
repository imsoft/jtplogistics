import { prisma } from "@/lib/db";
import { requireQuoteAuthor } from "@/lib/auth-server";
import { nextQuoteNumber } from "@/lib/quote-number";

export async function GET() {
  try {
    const session = await requireQuoteAuthor();

    // El colaborador necesita el permiso; admin y vendedor entran por su rol.
    if (session.user.role === "collaborator") {
      const me = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { canViewQuotes: true },
      });
      if (!me?.canViewQuotes) {
        return Response.json({ error: "Sin permiso" }, { status: 403 });
      }
    }

    return Response.json({ quoteNumber: await nextQuoteNumber() });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
