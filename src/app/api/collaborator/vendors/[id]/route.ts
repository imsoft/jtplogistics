import { prisma } from "@/lib/db";
import { requireCollaboratorOrAdmin } from "@/lib/auth-server";
import { hashPassword } from "better-auth/crypto";

async function checkPermission(userId: string) {
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      canViewVendors: true,
      canReadRecords: true,
      canUpdateRecords: true,
      canDeleteRecords: true,
    },
  });
  return {
    canRead: Boolean(me?.canViewVendors && me?.canReadRecords),
    canUpdate: Boolean(me?.canViewVendors && me?.canUpdateRecords),
    canDelete: Boolean(me?.canViewVendors && me?.canDeleteRecords),
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
    const u = await prisma.user.findUnique({ where: { id } });
    if (!u || u.role !== "vendor") {
      return Response.json({ error: "No encontrado" }, { status: 404 });
    }
    return Response.json({
      id: u.id,
      name: u.name,
      position: u.position,
      email: u.email,
      image: u.image,
      birthDate: u.birthDate ? u.birthDate.toISOString().split("T")[0] : null,
      createdAt: u.createdAt.toISOString(),
    });
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
    const { name, position, birthDate, password } = body as {
      name?: string;
      position?: string | null;
      birthDate?: string | null;
      password?: string;
    };

    const u = await prisma.user.findUnique({ where: { id } });
    if (!u || u.role !== "vendor") {
      return Response.json({ error: "No encontrado" }, { status: 404 });
    }

    const parsedBirthDate = birthDate !== undefined
      ? (birthDate ? new Date(birthDate) : null)
      : undefined;

    await prisma.user.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(position !== undefined && { position: position?.trim() || null }),
        ...(parsedBirthDate !== undefined && { birthDate: parsedBirthDate }),
      },
    });

    if (password?.trim()) {
      const hashed = await hashPassword(password.trim());
      await prisma.account.updateMany({
        where: { userId: id, providerId: "credential" },
        data: { password: hashed },
      });
    }

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
    const u = await prisma.user.findUnique({ where: { id } });
    if (!u || u.role !== "vendor") {
      return Response.json({ error: "No encontrado" }, { status: 404 });
    }
    await prisma.user.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
