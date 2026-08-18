import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { adminHandler } from "@/lib/api-handler";
import type { Prisma, QuoteStatus } from "@prisma/client";
import { QUOTE_STATUS_VALUES } from "@/lib/constants/quote-status";
import { logAudit, diffObjects } from "@/lib/audit-log";

const FIELD_LABELS: Record<string, string> = {
  company: "Compañía",
  contact: "Contacto",
  phone: "Teléfono",
  email: "Correo",
  validUntil: "Vigencia",
  status: "Estado",
};

/** Resumen legible de las rutas de la cotización para la bitácora. */
function summarizeRows(rows: unknown): string {
  const list = Array.isArray(rows) ? (rows as { cost?: number }[]) : [];
  const total = list.reduce((sum, r) => sum + (Number(r.cost) || 0), 0);
  return `${list.length} ruta${list.length !== 1 ? "s" : ""} · $${total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
}

export function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminHandler(async () => {
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
    if (!quote) return Response.json({ error: "No encontrado" }, { status: 404 });
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
  });
}

export function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminHandler(async (session) => {
    const { id } = await params;
    const body = await request.json() as {
      company?: string;
      contact?: string;
      phone?: string | null;
      email?: string | null;
      validUntil?: string;
      rows?: Prisma.InputJsonValue[];
      status?: string;
    };

    if (body.status !== undefined && !QUOTE_STATUS_VALUES.includes(body.status as QuoteStatus)) {
      return Response.json({ error: "Estado inválido" }, { status: 400 });
    }

    const quote = await prisma.generatedQuote.findUnique({ where: { id } });
    if (!quote) return Response.json({ error: "No encontrado" }, { status: 404 });

    const updated = await prisma.generatedQuote.update({
      where: { id },
      data: {
        ...(body.company && { company: body.company.trim() }),
        ...(body.contact && { contact: body.contact.trim() }),
        ...(body.phone !== undefined && { phone: body.phone?.trim() || null }),
        ...(body.email !== undefined && { email: body.email?.trim() || null }),
        ...(body.validUntil && { validUntil: new Date(body.validUntil) }),
        ...(body.rows && { rows: body.rows }),
        ...(body.status && { status: body.status as QuoteStatus }),
      },
    });

    const changes = diffObjects(
      {
        company: quote.company,
        contact: quote.contact,
        phone: quote.phone,
        email: quote.email,
        validUntil: quote.validUntil.toISOString().split("T")[0],
        status: quote.status,
      },
      {
        company: updated.company,
        contact: updated.contact,
        phone: updated.phone,
        email: updated.email,
        validUntil: updated.validUntil.toISOString().split("T")[0],
        status: updated.status,
      },
      FIELD_LABELS
    );
    if (body.rows && JSON.stringify(quote.rows) !== JSON.stringify(updated.rows)) {
      changes.push({
        field: "rows",
        label: "Rutas",
        from: summarizeRows(quote.rows),
        to: summarizeRows(updated.rows),
      });
    }
    if (changes.length > 0) {
      void logAudit({
        resource: "generated_quote", resourceId: id,
        resourceLabel: `${quote.quoteNumber} — ${updated.company}`,
        action: "updated", userId: session.user.id, userName: (session.user as { name: string }).name,
        changes,
      });
    }

    return Response.json({ ok: true });
  });
}

export function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminHandler(async (session) => {
    const { id } = await params;
    const quote = await prisma.generatedQuote.findUnique({ where: { id } });
    if (!quote) return Response.json({ error: "No encontrado" }, { status: 404 });
    await prisma.generatedQuote.delete({ where: { id } });
    void logAudit({
      resource: "generated_quote", resourceId: id,
      resourceLabel: `${quote.quoteNumber} — ${quote.company}`,
      action: "deleted", userId: session.user.id, userName: (session.user as { name: string }).name,
    });
    return Response.json({ ok: true });
  });
}
