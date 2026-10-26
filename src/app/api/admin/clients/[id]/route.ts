import { prisma } from "@/lib/db";
import { readClientFiscal } from "@/lib/sat-catalogs";
import { adminHandler } from "@/lib/api-handler";
import { logAudit, diffObjects } from "@/lib/audit-log";
import { parseClientProductTypes } from "@/lib/parse-client-product-types";

function toJson(c: {
  id: string;
  name: string;
  contactName?: string | null;
  position?: string | null;
  legalName: string | null;
  rfc: string | null;
  taxRegime?: string | null;
  fiscalZip?: string | null;
  cfdiUse?: string | null;
  creditDays?: number | null;
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
    taxRegime: c.taxRegime ?? null,
    fiscalZip: c.fiscalZip ?? null,
    cfdiUse: c.cfdiUse ?? null,
    creditDays: c.creditDays ?? null,
    email: c.email,
    phone: c.phone,
    address: c.address,
    notes: c.notes,
    detentionConditions: c.detentionConditions,
    productTypes: c.productTypes ?? [],
    createdAt: c.createdAt.toISOString(),
  };
}

export function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminHandler(async () => {
    const { id } = await params;
    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) return Response.json({ error: "No encontrado" }, { status: 404 });
    return Response.json(toJson(client));
  });
}

const CLIENT_LABELS: Record<string, string> = {
  name: "Nombre", legalName: "Razón social", rfc: "RFC", taxRegime: "Régimen fiscal", fiscalZip: "CP fiscal", cfdiUse: "Uso del CFDI", creditDays: "Días de crédito", email: "Correo",
  contactName: "Nombre de contacto",
  position: "Puesto",
  phone: "Teléfono", address: "Dirección", notes: "Notas", detentionConditions: "Condiciones de estadías",
  productTypes: "Tipos de producto",
};

export function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminHandler(async (session) => {
    const { id } = await params;
    const body = await request.json();
    const { name, contactName, position, legalName, email, phone, address, notes, detentionConditions, productTypes } = body as {
      name?: string;
      contactName?: string | null;
      position?: string | null;
      legalName?: string | null;
      rfc?: string | null;
      email?: string | null;
      phone?: string | null;
      address?: string | null;
      notes?: string | null;
      detentionConditions?: string | null;
      productTypes?: unknown;
    };

    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) return Response.json({ error: "No encontrado" }, { status: 404 });

    const fiscal = readClientFiscal(body as Record<string, unknown>);
    if (!fiscal.ok) return Response.json({ error: fiscal.error }, { status: 400 });
    if (name !== undefined && !String(name).trim()) {
      return Response.json({ error: "El nombre es requerido" }, { status: 400 });
    }

    const updated = await prisma.client.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: String(name).trim() }),
        ...(contactName !== undefined && { contactName: contactName?.trim() || null }),
        ...(position !== undefined && { position: position?.trim() || null }),
        ...(legalName !== undefined && { legalName: legalName?.trim() || null }),
        ...fiscal.data,
        ...(email !== undefined && { email: email?.trim() || null }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
        ...(address !== undefined && { address: address?.trim() || null }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
        ...(detentionConditions !== undefined && { detentionConditions: detentionConditions?.trim() || null }),
        ...(productTypes !== undefined && { productTypes: parseClientProductTypes(productTypes) }),
      },
    });

    const changes = diffObjects(client as Record<string, unknown>, updated as Record<string, unknown>, CLIENT_LABELS);
    if (changes.length > 0) {
      void logAudit({
        resource: "client", resourceId: id, resourceLabel: updated.name,
        action: "updated", userId: session.user.id, userName: session.user.name, changes,
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
    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) return Response.json({ error: "No encontrado" }, { status: 404 });
    await prisma.client.delete({ where: { id } });
    void logAudit({
      resource: "client", resourceId: id, resourceLabel: client.name,
      action: "deleted", userId: session.user.id, userName: session.user.name,
    });
    return Response.json({ ok: true });
  });
}
