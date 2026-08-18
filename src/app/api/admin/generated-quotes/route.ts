import { prisma } from "@/lib/db";
import { adminHandler } from "@/lib/api-handler";

export function GET() {
  return adminHandler(async () => {
    const quotes = await prisma.generatedQuote.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        quoteNumber: true,
        company: true,
        contact: true,
        phone: true,
        email: true,
        validUntil: true,
        rows: true,
        createdAt: true,
        createdBy: { select: { id: true, name: true } },
      },
    });

    return Response.json(
      quotes.map((q) => ({
        ...q,
        validUntil: q.validUntil.toISOString().split("T")[0],
        createdAt: q.createdAt.toISOString(),
      }))
    );
  });
}
