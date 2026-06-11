import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { gateMaritime } from "@/lib/maritime-quote-auth";
import { computeMaritimeQuote, type MaritimeQuoteInput } from "@/lib/maritime-quote";
import { logAudit } from "@/lib/audit-log";
import type { Prisma } from "@prisma/client";

export async function GET() {
  try {
    await gateMaritime("canViewMaritimeQuotes");
    const quotes = await prisma.maritimeQuote.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        reference: true,
        client: true,
        data: true,
        status: true,
        validUntil: true,
        createdAt: true,
        createdBy: { select: { name: true } },
      },
    });

    return Response.json(
      quotes.map((q) => ({
        id: q.id,
        reference: q.reference,
        client: q.client,
        status: q.status,
        validUntil: q.validUntil.toISOString(),
        createdAt: q.createdAt.toISOString(),
        createdByName: q.createdBy.name,
        total: computeMaritimeQuote(q.data as unknown as MaritimeQuoteInput).totalADepositar,
      }))
    );
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await gateMaritime("canCreateMaritimeQuotes");
    const body = (await request.json()) as {
      reference: string;
      client: string;
      validUntil: string;
      data: MaritimeQuoteInput;
    };

    if (!body.reference || !body.client || !body.validUntil || !body.data) {
      return Response.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const quote = await prisma.maritimeQuote.create({
      data: {
        reference: body.reference.trim(),
        client: body.client.trim(),
        validUntil: new Date(body.validUntil),
        data: body.data as unknown as Prisma.InputJsonValue,
        createdById: session.user.id,
      },
    });

    void logAudit({
      resource: "maritime_quote", resourceId: quote.id,
      resourceLabel: `${quote.reference} — ${quote.client}`,
      action: "created", userId: session.user.id, userName: (session.user as { name: string }).name,
    });

    return Response.json({ id: quote.id }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
