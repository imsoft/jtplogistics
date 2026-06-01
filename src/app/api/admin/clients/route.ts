import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { adminHandler } from "@/lib/api-handler";
import { logAudit } from "@/lib/audit-log";
import { parseClientProductTypes } from "@/lib/parse-client-product-types";

const SEARCH_FIELDS = [
  "name", "contactName", "position", "legalName", "rfc", "email", "phone",
] as const;

const SORTABLE_FIELDS = new Set([
  "name", "contactName", "position", "legalName", "email", "phone", "createdAt",
]);

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

export function GET(request: Request) {
  return adminHandler(async () => {
    const { searchParams } = new URL(request.url);
    const all = searchParams.get("all") === "1";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const pageSize = Math.min(200, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10) || 20));
    const q = (searchParams.get("q") ?? "").trim();
    const sortBy = searchParams.get("sortBy") ?? "createdAt";
    const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";

    const where: Prisma.ClientWhereInput = {};
    if (q) {
      where.OR = SEARCH_FIELDS.map((field) => ({
        [field]: { contains: q, mode: "insensitive" as Prisma.QueryMode },
      })) as Prisma.ClientWhereInput[];
    }

    const orderBy: Prisma.ClientOrderByWithRelationInput = SORTABLE_FIELDS.has(sortBy)
      ? ({ [sortBy]: sortDir } as Prisma.ClientOrderByWithRelationInput)
      : { createdAt: "desc" };

    const [total, clients] = await Promise.all([
      prisma.client.count({ where }),
      prisma.client.findMany({
        where,
        orderBy,
        ...(all ? {} : { skip: (page - 1) * pageSize, take: pageSize }),
      }),
    ]);

    return Response.json({ data: clients.map(toJson), total, page, pageSize });
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
