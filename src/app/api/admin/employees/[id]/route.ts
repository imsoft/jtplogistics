import { prisma } from "@/lib/db";
import { adminHandler } from "@/lib/api-handler";

export function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminHandler(async () => {
    const { id } = await params;
    const u = await prisma.user.findUnique({
      where: { id },
      include: { employeeProfile: true },
    });
    if (!u || u.role !== "collaborator") {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    return Response.json({
      id: u.id,
      name: u.name,
      email: u.email,
      image: u.image,
      birthDate: u.birthDate ? u.birthDate.toISOString().split("T")[0] : null,
      position: u.employeeProfile?.position ?? null,
      department: u.employeeProfile?.department ?? null,
      phone: u.employeeProfile?.phone ?? null,
      password: u.employeeProfile?.password ?? null,
      createdAt: u.createdAt.toISOString(),
    });
  });
}

export function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminHandler(async () => {
    const { id } = await params;
    const body = await request.json();
    const { name, position, department, phone, password, birthDate } = body as {
      name?: string;
      position?: string;
      department?: string;
      phone?: string;
      password?: string;
      birthDate?: string | null;
    };

    const u = await prisma.user.findUnique({ where: { id } });
    if (!u || u.role !== "collaborator") {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const parsedBirthDate = birthDate !== undefined
      ? (birthDate ? new Date(birthDate) : null)
      : undefined;

    if (name || parsedBirthDate !== undefined) {
      await prisma.user.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(parsedBirthDate !== undefined && { birthDate: parsedBirthDate }),
        },
      });
    }

    await prisma.employeeProfile.upsert({
      where: { userId: id },
      update: {
        position: position?.trim() ?? undefined,
        department: department?.trim() ?? undefined,
        phone: phone?.trim() ?? undefined,
        ...(password !== undefined && { password: password || null }),
      },
      create: {
        userId: id,
        position: position?.trim() || null,
        department: department?.trim() || null,
        phone: phone?.trim() || null,
        password: password || null,
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
    const u = await prisma.user.findUnique({ where: { id } });
    if (!u || u.role !== "collaborator") {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    await prisma.user.delete({ where: { id } });
    return Response.json({ ok: true });
  });
}
