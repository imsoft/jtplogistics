import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireQuoteAuthor } from "@/lib/auth-server";
import { logAudit } from "@/lib/audit-log";
import { nextQuoteNumber } from "@/lib/quote-number";
import type { Prisma } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const session = await requireQuoteAuthor();

    // El colaborador necesita el permiso; admin y vendedor entran por su rol.
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
      email?: string;
      validUntil: string;
      rows: Prisma.InputJsonValue[];
    };

    const { quoteNumber, company, contact, phone, email, validUntil, rows } = body;

    if (!quoteNumber || !company || !contact || !validUntil || !rows?.length) {
      return Response.json({ error: "Datos incompletos" }, { status: 400 });
    }

    // El número lo confirma el servidor al guardar: el de la pantalla se pidió
    // al abrirla y para cuando se descarga el PDF puede haberlo tomado otra
    // persona. Si está ocupado se reintenta con el siguiente libre, así el
    // consecutivo siempre avanza en lugar de quedarse trabado.
    let assignedNumber = quoteNumber;
    let quote: { id: string } | null = null;

    for (let intento = 0; intento < 5 && !quote; intento++) {
      try {
        quote = await prisma.generatedQuote.create({
          data: {
            quoteNumber: assignedNumber,
            company,
            contact,
            phone: phone?.trim() || null,
            email: email?.trim() || null,
            validUntil: new Date(validUntil),
            rows,
            createdById: session.user.id,
          },
          select: { id: true },
        });
      } catch (e) {
        const code = (e as { code?: string }).code;
        if (code !== "P2002") throw e;   // solo el choque de número se reintenta
        assignedNumber = await nextQuoteNumber();
      }
    }

    if (!quote) {
      return Response.json(
        { error: "No se pudo asignar un número de cotización libre." },
        { status: 409 }
      );
    }

    void logAudit({
      resource: "generated_quote", resourceId: quote.id,
      resourceLabel: `${assignedNumber} — ${company}`,
      action: "created", userId: session.user.id, userName: (session.user as { name: string }).name,
    });

    // Se devuelve el número realmente usado para que la pantalla lo muestre.
    return Response.json({ id: quote.id, quoteNumber: assignedNumber }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
