import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { adminHandler } from "@/lib/api-handler";
import type { Prisma } from "@prisma/client";

export function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminHandler(async () => {
    const { id } = await params;
    const quote = await prisma.generatedQuote.findUnique({ where: { id } });
    if (!quote) return Response.json({ error: "No encontrado" }, { status: 404 });
    return Response.json({
      ...quote,
      validUntil: quote.validUntil.toISOString().split("T")[0],
      createdAt: quote.createdAt.toISOString(),
    });
  });
}

export function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminHandler(async () => {
    const { id } = await params;
    const body = await request.json() as {
      company?: string;
      contact?: string;
      phone?: string | null;
      validUntil?: string;
      rows?: Prisma.InputJsonValue[];
    };

    const quote = await prisma.generatedQuote.findUnique({ where: { id } });
    if (!quote) return Response.json({ error: "No encontrado" }, { status: 404 });

    await prisma.generatedQuote.update({
      where: { id },
      data: {
        ...(body.company && { company: body.company.trim() }),
        ...(body.contact && { contact: body.contact.trim() }),
        ...(body.phone !== undefined && { phone: body.phone?.trim() || null }),
        ...(body.validUntil && { validUntil: new Date(body.validUntil) }),
        ...(body.rows && { rows: body.rows }),
      },
    });

    return Response.json({ ok: true });
  });
}

export function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminHandler(async () => {
    const { id } = await params;
    const quote = await prisma.generatedQuote.findUnique({ where: { id } });
    if (!quote) return Response.json({ error: "No encontrado" }, { status: 404 });
    await prisma.generatedQuote.delete({ where: { id } });
    return Response.json({ ok: true });
  });
}
