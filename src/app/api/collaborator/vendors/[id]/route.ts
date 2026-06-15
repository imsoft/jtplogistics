import { prisma } from "@/lib/db";
import { requireCollaboratorOrAdmin } from "@/lib/auth-server";
import { hashPassword } from "better-auth/crypto";
import { logAudit, diffObjects } from "@/lib/audit-log";

const VENDOR_LABELS = { name: "Nombre", position: "Puesto", birthDate: "Fecha de nacimiento" };

async function checkPermission(userId: string) {
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      canViewVendors: true,
      canUpdateVendors: true,
      canDeleteVendors: true,
    },
  });
  return {
    canRead: Boolean(me?.canViewVendors),
    canUpdate: Boolean(me?.canUpdateVendors),
    canDelete: Boolean(me?.canDeleteVendors),
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
    if (e instanceof Response) return e;
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

    const before = {
      name: u.name,
      position: u.position,
      birthDate: u.birthDate ? u.birthDate.toISOString().split("T")[0] : null,
    };

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

    let passwordChanged = false;
    if (password?.trim()) {
      const hashed = await hashPassword(password.trim());
      await prisma.account.updateMany({
        where: { userId: id, providerId: "credential" },
        data: { password: hashed },
      });
      passwordChanged = true;
    }

    const after = {
      name: name ?? u.name,
      position: position !== undefined ? (position || null) : u.position,
      birthDate: birthDate !== undefined ? (birthDate ?? null) : (u.birthDate ? u.birthDate.toISOString().split("T")[0] : null),
    };
    const changes = diffObjects(before, after, VENDOR_LABELS);
    if (passwordChanged) changes.push({ field: "password", label: "Contraseña", from: null, to: "Actualizada" });
    if (changes.length > 0) {
      void logAudit({
        resource: "vendor", resourceId: id, resourceLabel: (name ?? u.name) ?? "",
        action: "updated", userId: session.user.id, userName: session.user.name, changes,
      });
    }

    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
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
    void logAudit({
      resource: "vendor", resourceId: id, resourceLabel: u.name ?? "",
      action: "deleted", userId: session.user.id, userName: session.user.name,
    });
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
