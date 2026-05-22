import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth-server";
import type { Prisma } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
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
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
