import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { gateMaritime } from "@/lib/maritime-quote-auth";
import { QUOTE_STATUS_VALUES } from "@/lib/constants/quote-status";
import { logAudit, diffObjects } from "@/lib/audit-log";
import type { Prisma, QuoteStatus } from "@prisma/client";
import type { MaritimeQuoteInput } from "@/lib/maritime-quote";

const FIELD_LABELS: Record<string, string> = {
  reference: "Referencia",
  client: "Cliente",
  validUntil: "Vigencia",
  status: "Estado",
};

/**
 * Una cotización aceptada queda bloqueada: solo el admin, o un colaborador al
 * que el admin le dio el permiso canEditAcceptedQuotes, puede editarla o eliminarla.
 * Lanza Response 403 si no tiene permiso.
 */
async function assertCanModifyAccepted(
  session: { user: { id: string; role?: string } },
  status: QuoteStatus
) {
  if (status !== "aceptada" || session.user.role !== "collaborator") return;
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { canEditAcceptedQuotes: true },
  });
  if (!me?.canEditAcceptedQuotes) {
    throw Response.json(
      { error: "Esta cotización ya fue aceptada. Solicita al administrador permiso para modificarla." },
      { status: 403 }
    );
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await gateMaritime("canViewMaritimeQuotes");
    const { id } = await params;
    const quote = await prisma.maritimeQuote.findUnique({ where: { id } });
    if (!quote) return Response.json({ error: "No encontrado" }, { status: 404 });
    return Response.json({
      id: quote.id,
      reference: quote.reference,
      client: quote.client,
      status: quote.status,
      data: quote.data,
      validUntil: quote.validUntil.toISOString().split("T")[0],
      createdAt: quote.createdAt.toISOString(),
    });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as {
      reference?: string;
      client?: string;
      validUntil?: string;
      data?: MaritimeQuoteInput;
      status?: string;
    };

    // Cambiar solo el estado requiere canUpdate; editar contenido también.
    const session = await gateMaritime("canUpdateMaritimeQuotes");

    if (body.status !== undefined && !QUOTE_STATUS_VALUES.includes(body.status as QuoteStatus)) {
      return Response.json({ error: "Estado inválido" }, { status: 400 });
    }

    const quote = await prisma.maritimeQuote.findUnique({ where: { id } });
    if (!quote) return Response.json({ error: "No encontrado" }, { status: 404 });

    await assertCanModifyAccepted(session, quote.status);

    const updated = await prisma.maritimeQuote.update({
      where: { id },
      data: {
        ...(body.reference && { reference: body.reference.trim() }),
        ...(body.client && { client: body.client.trim() }),
        ...(body.validUntil && { validUntil: new Date(body.validUntil) }),
        ...(body.data && { data: body.data as unknown as Prisma.InputJsonValue }),
        ...(body.status && { status: body.status as QuoteStatus }),
      },
    });

    const changes = diffObjects(
      {
        reference: quote.reference,
        client: quote.client,
        validUntil: quote.validUntil.toISOString().split("T")[0],
        status: quote.status,
      },
      {
        reference: updated.reference,
        client: updated.client,
        validUntil: updated.validUntil.toISOString().split("T")[0],
        status: updated.status,
      },
      FIELD_LABELS
    );
    if (body.data && JSON.stringify(quote.data) !== JSON.stringify(updated.data)) {
      changes.push({ field: "data", label: "Contenido", from: null, to: "Actualizado" });
    }
    if (changes.length > 0) {
      void logAudit({
        resource: "maritime_quote", resourceId: id,
        resourceLabel: `${quote.reference} — ${updated.client}`,
        action: "updated", userId: session.user.id, userName: (session.user as { name: string }).name,
        changes,
      });
    }

    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await gateMaritime("canDeleteMaritimeQuotes");
    const { id } = await params;
    const quote = await prisma.maritimeQuote.findUnique({ where: { id } });
    if (!quote) return Response.json({ error: "No encontrado" }, { status: 404 });
    await assertCanModifyAccepted(session, quote.status);
    await prisma.maritimeQuote.delete({ where: { id } });
    void logAudit({
      resource: "maritime_quote", resourceId: id,
      resourceLabel: `${quote.reference} — ${quote.client}`,
      action: "deleted", userId: session.user.id, userName: (session.user as { name: string }).name,
    });
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
