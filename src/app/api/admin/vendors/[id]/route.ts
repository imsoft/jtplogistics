import { prisma } from "@/lib/db";
import { adminHandler } from "@/lib/api-handler";
import { hashPassword } from "better-auth/crypto";
import { logAudit, diffObjects } from "@/lib/audit-log";

export function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminHandler(async (_session) => {
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
  });
}

export function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminHandler(async (session) => {
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

    if (password?.trim()) {
      const hashed = await hashPassword(password.trim());
      await prisma.account.updateMany({
        where: { userId: id, providerId: "credential" },
        data: { password: hashed },
      });
    }

    const after = {
      name: name ?? u.name,
      position: position !== undefined ? (position || null) : u.position,
      birthDate: birthDate !== undefined ? (birthDate ?? null) : (u.birthDate ? u.birthDate.toISOString().split("T")[0] : null),
    };

    const fieldLabels = { name: "Nombre", position: "Puesto", birthDate: "Fecha de nacimiento" };
    const changes = diffObjects(before, after, fieldLabels);

    if (changes.length > 0) {
      void logAudit({
        resource: "vendor",
        resourceId: id,
        resourceLabel: (name ?? u.name) ?? "",
        action: "updated",
        userId: session.user.id,
        userName: session.user.name,
        changes,
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
    const u = await prisma.user.findUnique({ where: { id } });
    if (!u || u.role !== "vendor") {
      return Response.json({ error: "No encontrado" }, { status: 404 });
    }
    await prisma.user.delete({ where: { id } });

    void logAudit({
      resource: "vendor",
      resourceId: id,
      resourceLabel: u.name ?? "",
      action: "deleted",
      userId: session.user.id,
      userName: session.user.name,
    });

    return Response.json({ ok: true });
  });
}
