import { prisma } from "@/lib/db";
import { adminHandler } from "@/lib/api-handler";
import { logAudit } from "@/lib/audit-log";
import { parseClientProductTypes } from "@/lib/parse-client-product-types";

function toJson(c: {
  id: string;
  name: string;
  contactName?: string | null;
  position?: string | null;
  legalName: string | null;
  rfc: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  detentionConditions: string | null;
  productTypes: string[];
  createdAt: Date;
}) {
  return {
    id: c.id,
    name: c.name,
    contactName: c.contactName ?? null,
    position: c.position ?? null,
    legalName: c.legalName,
    rfc: c.rfc,
    email: c.email,
    phone: c.phone,
    address: c.address,
    notes: c.notes,
    detentionConditions: c.detentionConditions,
    productTypes: c.productTypes ?? [],
    createdAt: c.createdAt.toISOString(),
  };
}

export function GET() {
  return adminHandler(async () => {
    const clients = await prisma.client.findMany({
      orderBy: { createdAt: "desc" },
    });
    return Response.json(clients.map(toJson));
  });
}

export function POST(request: Request) {
  return adminHandler(async (session) => {
    const body = await request.json();
    const { name, contactName, position, legalName, rfc, email, phone, address, notes, detentionConditions, productTypes } = body as {
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

    const client = await prisma.client.create({
      data: {
        name: String(name).trim(),
        contactName: contactName?.trim() || null,
        position: position?.trim() || null,
        legalName: legalName?.trim() || null,
        rfc: rfc?.trim() || null,
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
