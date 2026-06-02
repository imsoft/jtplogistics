import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireCollaboratorOrAdmin } from "@/lib/auth-server";
import type { Prisma } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const session = await requireCollaboratorOrAdmin();

    // Collaborators need canCreateQuotes; admins bypass
    if (session.user.role === "collaborator") {
      const me = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { canCreateQuotes: true },
      });
      if (!me?.canCreateQuotes) {
        return Response.json({ error: "Sin permiso" }, { status: 403 });
      }
    }

    const body = await request.json() as {
      quoteNumber: string;
      company: string;
      contact: string;
      phone?: string;
      validUntil: string;
      rows: Prisma.InputJsonValue[];
    };

    const { quoteNumber, company, contact, phone, validUntil, rows } = body;

    if (!quoteNumber || !company || !contact || !validUntil || !rows?.length) {
      return Response.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const quote = await prisma.generatedQuote.create({
      data: {
        quoteNumber,
        company,
        contact,
        phone: phone?.trim() || null,
        validUntil: new Date(validUntil),
        rows,
        createdById: session.user.id,
      },
    });

    return Response.json({ id: quote.id }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
