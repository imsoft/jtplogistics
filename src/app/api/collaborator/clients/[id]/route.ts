import { prisma } from "@/lib/db";
import { requireCollaboratorOrAdmin } from "@/lib/auth-server";
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

async function checkPermission(userId: string) {
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      canViewClients: true,
      canUpdateClients: true,
      canDeleteClients: true,
    },
  });
  return {
    canRead: Boolean(me?.canViewClients),
    canUpdate: Boolean(me?.canUpdateClients),
    canDelete: Boolean(me?.canDeleteClients),
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireCollaboratorOrAdmin();
    const permission = await checkPermission(session.user.id);
    if (!permission.canRead) {
      return Response.json({ error: "Sin permiso" }, { status: 403 });
    }

    const { id } = await params;
    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) return Response.json({ error: "No encontrado" }, { status: 404 });
    return Response.json(toJson(client));
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireCollaboratorOrAdmin();
    const permission = await checkPermission(session.user.id);
    if (!permission.canUpdate) {
      return Response.json({ error: "Sin permiso" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, contactName, position, legalName, rfc, email, phone, address, notes, detentionConditions, productTypes } = body as {
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

    if (name !== undefined && !String(name).trim()) {
      return Response.json({ error: "El nombre es requerido" }, { status: 400 });
    }

    await prisma.client.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: String(name).trim() }),
        ...(contactName !== undefined && { contactName: contactName?.trim() || null }),
        ...(position !== undefined && { position: position?.trim() || null }),
        ...(legalName !== undefined && { legalName: legalName?.trim() || null }),
        ...(rfc !== undefined && { rfc: rfc?.trim() || null }),
        ...(email !== undefined && { email: email?.trim() || null }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
        ...(address !== undefined && { address: address?.trim() || null }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
        ...(detentionConditions !== undefined && { detentionConditions: detentionConditions?.trim() || null }),
        ...(productTypes !== undefined && { productTypes: parseClientProductTypes(productTypes) }),
      },
    });

    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireCollaboratorOrAdmin();
    const permission = await checkPermission(session.user.id);
    if (!permission.canDelete) {
      return Response.json({ error: "Sin permiso" }, { status: 403 });
    }

    const { id } = await params;
    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) return Response.json({ error: "No encontrado" }, { status: 404 });
    await prisma.client.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
