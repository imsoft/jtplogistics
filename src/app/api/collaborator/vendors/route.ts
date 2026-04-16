import { prisma } from "@/lib/db";
import { requireCollaboratorOrAdmin } from "@/lib/auth-server";
import { createAuthUser } from "@/lib/create-auth-user";

export async function GET() {
  try {
    const session = await requireCollaboratorOrAdmin();

    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { canViewVendors: true },
    });

    if (!me?.canViewVendors) {
      return Response.json({ error: "Sin permiso" }, { status: 403 });
    }

    const vendors = await prisma.user.findMany({
      where: { role: "vendor" },
      orderBy: { createdAt: "desc" },
    });

    return Response.json(
      vendors.map((u) => ({
        id: u.id,
        name: u.name,
        position: u.position,
        email: u.email,
        image: u.image,
        birthDate: u.birthDate ? u.birthDate.toISOString().split("T")[0] : null,
        createdAt: u.createdAt.toISOString(),
      }))
    );
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireCollaboratorOrAdmin();

    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { canViewVendors: true },
    });

    if (!me?.canViewVendors) {
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

    return Response.json({ id: userId }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
