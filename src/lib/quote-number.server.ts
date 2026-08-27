import { prisma } from "@/lib/db";
import { nextSuffix, quoteNumberPrefix } from "@/lib/quote-number";

/**
 * Siguiente número libre, con la fecha de hoy y el consecutivo corrido.
 *
 * Vive aparte del cálculo puro porque este módulo arrastra la conexión a la
 * base: así `quote-number.ts` se puede probar sin levantar Prisma.
 */
export async function nextQuoteNumber(date = new Date()): Promise<string> {
  const used = await prisma.generatedQuote.findMany({ select: { quoteNumber: true } });
  const next = nextSuffix(used.map((q) => q.quoteNumber));
  return `${quoteNumberPrefix(date)}${String(next).padStart(3, "0")}`;
}
