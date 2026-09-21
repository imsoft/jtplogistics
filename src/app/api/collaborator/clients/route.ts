import { prisma } from "@/lib/db";
import { requireCollaboratorOrAdmin } from "@/lib/auth-server";
import { parseClientProductTypes } from "@/lib/parse-client-product-types";
import { listClientsPage } from "@/lib/clients-list";
import { logAudit } from "@/lib/audit-log";

export async function GET(request: Request) {
  try {
    const session = await requireCollaboratorOrAdmin();

    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { canViewClients: true },
    });

    if (!me?.canViewClients) {
      return Response.json({ error: "Sin permiso" }, { status: 403 });
    }

    // La misma consulta que dirección: la tabla pagina en el servidor.
    const { searchParams } = new URL(request.url);
    return Response.json(await listClientsPage(searchParams));
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireCollaboratorOrAdmin();

    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { canCreateClients: true },
    });

    if (!me?.canCreateClients) {
      return Response.json({ error: "Sin permiso" }, { status: 403 });
    }

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
      resource: "client", resourceId: client.id, resourceLabel: client.name,
      action: "created", userId: session.user.id, userName: session.user.name,
    });

    return Response.json({ id: client.id }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
