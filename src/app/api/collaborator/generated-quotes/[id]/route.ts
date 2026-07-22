import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireCollaboratorOrAdmin } from "@/lib/auth-server";
import type { Prisma, QuoteStatus } from "@prisma/client";
import { QUOTE_STATUS_VALUES } from "@/lib/constants/quote-status";
import { logAudit } from "@/lib/audit-log";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireCollaboratorOrAdmin();
    const { id } = await params;

    const quote = await prisma.generatedQuote.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            name: true,
            position: true,
            employeeProfile: { select: { position: true } },
          },
        },
      },
    });

    if (!quote) {
      return Response.json({ error: "No encontrado" }, { status: 404 });
    }

    if (quote.createdById !== session.user.id) {
      return Response.json({ error: "Sin permiso" }, { status: 403 });
    }

    return Response.json({
      ...quote,
      validUntil: quote.validUntil.toISOString().split("T")[0],
      createdAt: quote.createdAt.toISOString(),
      // Nombre y puesto de quien creó la cotización: se usan en la zona de
      // firmas del PDF y nunca deben sustituirse por los de otra persona.
      creatorName: quote.createdBy.name,
      creatorPosition:
        quote.createdBy.employeeProfile?.position ?? quote.createdBy.position ?? null,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("Error al obtener cotización:", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

/**
 * PATCH — editar una cotización propia. Requiere canUpdateQuotes (el admin
 * pasa por su propio endpoint). Un colaborador solo puede editar las cotizaciones
 * que él creó.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireCollaboratorOrAdmin();
    const { id } = await params;

    if (session.user.role === "collaborator") {
      const me = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { canUpdateQuotes: true },
      });
      if (!me?.canUpdateQuotes) {
        return Response.json({ error: "Sin permiso" }, { status: 403 });
      }
    }

    const quote = await prisma.generatedQuote.findUnique({ where: { id } });
    if (!quote) {
      return Response.json({ error: "No encontrado" }, { status: 404 });
    }
    if (quote.createdById !== session.user.id) {
      return Response.json({ error: "Sin permiso" }, { status: 403 });
    }

    const body = (await request.json()) as {
      company?: string;
      contact?: string;
      phone?: string | null;
      validUntil?: string;
      rows?: Prisma.InputJsonValue[];
      status?: string;
    };

    if (body.status !== undefined && !QUOTE_STATUS_VALUES.includes(body.status as QuoteStatus)) {
      return Response.json({ error: "Estado inválido" }, { status: 400 });
    }

    await prisma.generatedQuote.update({
      where: { id },
      data: {
        ...(body.company && { company: body.company.trim() }),
        ...(body.contact && { contact: body.contact.trim() }),
        ...(body.phone !== undefined && { phone: body.phone?.trim() || null }),
        ...(body.validUntil && { validUntil: new Date(body.validUntil) }),
        ...(body.rows && { rows: body.rows }),
        ...(body.status && { status: body.status as QuoteStatus }),
      },
    });

    void logAudit({
      resource: "generated_quote",
      resourceId: id,
      resourceLabel: `${quote.quoteNumber} — ${body.company ?? quote.company}`,
      action: "updated",
      userId: session.user.id,
      userName: (session.user as { name: string }).name,
    });

    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("Error al actualizar cotización:", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
