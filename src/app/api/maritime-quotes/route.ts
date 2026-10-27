import { NextRequest } from "next/server";
import { maritimeMonthPrefix, nextMaritimeReference } from "@/lib/maritime-reference";
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
        rejectionReason: true,
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
        rejectionReason: q.rejectionReason,
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
      client?: string;
      validUntil: string;
      data: MaritimeQuoteInput;
      /** "borrador" para guardar sin enviar; cualquier otra cosa es enviada. */
      status?: string;
    };
    const isDraft = body.status === "borrador";

    // El borrador puede ir sin cliente: es lo que va a medias.
    if (!body.reference || !body.validUntil || !body.data) {
      return Response.json({ error: "Datos incompletos" }, { status: 400 });
    }
    if (!isDraft && !body.client) {
      return Response.json({ error: "Datos incompletos" }, { status: 400 });
    }

    // Si alguien más tomó ese folio mientras se capturaba, se usa el siguiente
    // libre en lugar de fallar.
    const create = (reference: string) =>
      prisma.maritimeQuote.create({
        data: {
          reference,
          client: (body.client ?? "").trim(),
          status: isDraft ? "borrador" : "enviada",
          validUntil: new Date(body.validUntil!),
          data: body.data as unknown as Prisma.InputJsonValue,
          createdById: session.user.id,
        },
      });
    let quote;
    try {
      quote = await create(body.reference.trim());
    } catch (err) {
      if ((err as { code?: string }).code !== "P2002") throw err;
      const prefix = maritimeMonthPrefix();
      const used = await prisma.maritimeQuote.findMany({ where: { reference: { startsWith: `${prefix}-` } }, select: { reference: true } });
      quote = await create(nextMaritimeReference(used.map((q) => q.reference), prefix));
    }

    void logAudit({
      resource: "maritime_quote", resourceId: quote.id,
      resourceLabel: `${quote.reference} — ${quote.client || "borrador sin cliente"}`,
      action: "created", userId: session.user.id, userName: (session.user as { name: string }).name,
    });

    return Response.json({ id: quote.id, reference: quote.reference }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
