import { prisma } from "@/lib/db";
import { nextSuffix, quoteNumberPrefix } from "@/lib/quote-number";
import type { QuoteScope } from "@/lib/quote-scope";

const INTERNATIONAL_TAG = "JTP-INT-";

/**
 * Siguiente número libre, con la fecha de hoy y el consecutivo corrido. Cada
 * cotizador lleva su consecutivo: el internacional arranca en 001 aparte.
 *
 * Vive aparte del cálculo puro porque este módulo arrastra la conexión a la
 * base: así `quote-number.ts` se puede probar sin levantar Prisma.
 */
export async function nextQuoteNumber(scope: QuoteScope = "nacional", date = new Date()): Promise<string> {
  // Se separa por el folio y no por el cotizador: las internacionales que se
  // hicieron antes de existir "INT" tienen número del consecutivo nacional y
  // deben seguir contando ahí para que no se repita un número.
  const used = await prisma.generatedQuote.findMany({
    where:
      scope === "internacional"
        ? { quoteNumber: { startsWith: INTERNATIONAL_TAG } }
        : { NOT: { quoteNumber: { startsWith: INTERNATIONAL_TAG } } },
    select: { quoteNumber: true },
  });
  const next = nextSuffix(used.map((q) => q.quoteNumber));
  return `${quoteNumberPrefix(date, scope === "internacional")}${String(next).padStart(3, "0")}`;
}
