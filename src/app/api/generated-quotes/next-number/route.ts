import { prisma } from "@/lib/db";
import { requireQuoteAuthor } from "@/lib/auth-server";
import { nextQuoteNumber } from "@/lib/quote-number.server";
import { parseQuoteScope } from "@/lib/quote-scope";

/** GET ?scope=nacional|internacional — el siguiente número de ese cotizador. */
export async function GET(request: Request) {
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

    return Response.json({ quoteNumber: await nextQuoteNumber(parseQuoteScope(new URL(request.url).searchParams.get("scope"))) });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
