import { prisma } from "@/lib/db";
import { adminHandler } from "@/lib/api-handler";

export function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminHandler(async () => {
    const { id } = await params;
    const u = await prisma.user.findUnique({ where: { id } });
    if (!u || u.role !== "vendor") {
      return Response.json({ error: "No encontrado" }, { status: 404 });
    }
    return Response.json({
      id: u.id,
      name: u.name,
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
  return adminHandler(async () => {
    const { id } = await params;
    const body = await request.json();
    const { name, birthDate } = body as {
      name?: string;
      birthDate?: string | null;
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
        ...(parsedBirthDate !== undefined && { birthDate: parsedBirthDate }),
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
    if (!u || u.role !== "vendor") {
      return Response.json({ error: "No encontrado" }, { status: 404 });
    }
    await prisma.user.delete({ where: { id } });
    return Response.json({ ok: true });
  });
}
