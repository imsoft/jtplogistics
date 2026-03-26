import { prisma } from "@/lib/db";
import { adminHandler } from "@/lib/api-handler";
import { logAudit, diffObjects } from "@/lib/audit-log";

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
  name: "Nombre", legalName: "Razón social", rfc: "RFC", email: "Correo",
  contactName: "Nombre de contacto",
  position: "Puesto",
  phone: "Teléfono", address: "Dirección", notes: "Notas", detentionConditions: "Condiciones de estadías",
};

export function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminHandler(async (session) => {
    const { id } = await params;
    const body = await request.json();
    const { name, contactName, position, legalName, rfc, email, phone, address, notes, detentionConditions } = body as {
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
    };

    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) return Response.json({ error: "No encontrado" }, { status: 404 });

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
        ...(rfc !== undefined && { rfc: rfc?.trim() || null }),
        ...(email !== undefined && { email: email?.trim() || null }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
        ...(address !== undefined && { address: address?.trim() || null }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
        ...(detentionConditions !== undefined && { detentionConditions: detentionConditions?.trim() || null }),
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
