import { prisma } from "@/lib/db";
import { requireCollaboratorOrAdmin } from "@/lib/auth-server";
import { createAuthUser } from "@/lib/create-auth-user";
import { logAudit } from "@/lib/audit-log";
import { listVendorsPage } from "@/lib/vendors-list";

export async function GET(request: Request) {
  try {
    const session = await requireCollaboratorOrAdmin();

    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { canViewVendors: true },
    });

    if (!me?.canViewVendors) {
      return Response.json({ error: "Sin permiso" }, { status: 403 });
    }

    // La misma consulta que dirección: la tabla pagina en el servidor.
    const { searchParams } = new URL(request.url);
    return Response.json(await listVendorsPage(searchParams));
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
      select: { canCreateVendors: true },
    });

    if (!me?.canCreateVendors) {
      return Response.json({ error: "Sin permiso" }, { status: 403 });
    }

    const body = await request.json();
    const { name, position, email, password, birthDate } = body as {
      name: string;
      position?: string;
      email: string;
      password: string;
      birthDate?: string | null;
    };

    if (!name || !email || !password) {
      return Response.json({ error: "name, email y password son requeridos" }, { status: 400 });
    }

    let userId: string;
    try {
      const created = await createAuthUser({ name, email, password });
      userId = created.id;
    } catch (e) {
      return Response.json({ error: e instanceof Error ? e.message : "No se pudo crear el usuario" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        role: "vendor",
        position: position?.trim() || null,
        ...(birthDate ? { birthDate: new Date(birthDate) } : {}),
      },
    });

    void logAudit({
      resource: "vendor", resourceId: userId, resourceLabel: name,
      action: "created", userId: session.user.id, userName: session.user.name,
    });

    return Response.json({ id: userId }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
