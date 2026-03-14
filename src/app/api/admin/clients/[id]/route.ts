import { prisma } from "@/lib/db";
import { adminHandler } from "@/lib/api-handler";

function toJson(c: {
  id: string;
  name: string;
  legalName: string | null;
  rfc: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  createdAt: Date;
}) {
  return {
    id: c.id,
    name: c.name,
    legalName: c.legalName,
    rfc: c.rfc,
    email: c.email,
    phone: c.phone,
    address: c.address,
    notes: c.notes,
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

export function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminHandler(async () => {
    const { id } = await params;
    const body = await request.json();
    const { name, legalName, rfc, email, phone, address, notes } = body as {
      name?: string;
      legalName?: string | null;
      rfc?: string | null;
      email?: string | null;
      phone?: string | null;
      address?: string | null;
      notes?: string | null;
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
        ...(legalName !== undefined && { legalName: legalName?.trim() || null }),
        ...(rfc !== undefined && { rfc: rfc?.trim() || null }),
        ...(email !== undefined && { email: email?.trim() || null }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
        ...(address !== undefined && { address: address?.trim() || null }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
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
    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) return Response.json({ error: "No encontrado" }, { status: 404 });
    await prisma.client.delete({ where: { id } });
    return Response.json({ ok: true });
  });
}
