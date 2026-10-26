import { prisma } from "@/lib/db";
import { readClientFiscal } from "@/lib/sat-catalogs";
import { adminHandler } from "@/lib/api-handler";
import { logAudit } from "@/lib/audit-log";
import { parseClientProductTypes } from "@/lib/parse-client-product-types";
import { listClientsPage } from "@/lib/clients-list";

export function GET(request: Request) {
  return adminHandler(async () => {
    const { searchParams } = new URL(request.url);
    return Response.json(await listClientsPage(searchParams));
  });
}

export function POST(request: Request) {
  return adminHandler(async (session) => {
    const body = await request.json();
    const { name, contactName, position, legalName, email, phone, address, notes, detentionConditions, productTypes } = body as {
      name: string;
      contactName?: string;
      position?: string;
      legalName?: string;
      rfc?: string;
      email?: string;
      phone?: string;
      address?: string;
      notes?: string;
      detentionConditions?: string;
      productTypes?: unknown;
    };

    if (!name || !String(name).trim()) {
      return Response.json({ error: "El nombre es requerido" }, { status: 400 });
    }

    const fiscal = readClientFiscal(body as Record<string, unknown>);
    if (!fiscal.ok) return Response.json({ error: fiscal.error }, { status: 400 });

    const client = await prisma.client.create({
      data: {
        name: String(name).trim(),
        contactName: contactName?.trim() || null,
        position: position?.trim() || null,
        legalName: legalName?.trim() || null,
        ...fiscal.data,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        notes: notes?.trim() || null,
        detentionConditions: detentionConditions?.trim() || null,
        productTypes: parseClientProductTypes(productTypes),
      },
    });

    void logAudit({
      resource: "client", resourceId: client.id, resourceLabel: String(name).trim(),
      action: "created", userId: session.user.id, userName: session.user.name,
    });

    return Response.json({ id: client.id }, { status: 201 });
  });
}
