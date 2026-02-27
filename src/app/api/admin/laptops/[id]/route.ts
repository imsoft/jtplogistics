import { prisma } from "@/lib/db";
import { adminHandler } from "@/lib/api-handler";

export function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminHandler(async () => {
    const { id } = await params;
    const laptop = await prisma.laptop.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, name: true } },
        emailAccount: { select: { id: true, email: true } },
      },
    });
    if (!laptop) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({
      id: laptop.id,
      name: laptop.name,
      password: laptop.password,
      serialNumber: laptop.serialNumber,
      assignedToId: laptop.assignedToId,
      assignedTo: laptop.assignedTo,
      emailAccountId: laptop.emailAccountId,
      emailAccount: laptop.emailAccount,
      createdAt: laptop.createdAt.toISOString(),
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
    const { name, password, serialNumber, assignedToId, emailAccountId } = body as {
      name?: string;
      password?: string;
      serialNumber?: string;
      assignedToId?: string | null;
      emailAccountId?: string | null;
    };

    const laptop = await prisma.laptop.findUnique({ where: { id } });
    if (!laptop) return Response.json({ error: "Not found" }, { status: 404 });

    await prisma.laptop.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(password !== undefined && { password: password || null }),
        ...(serialNumber !== undefined && { serialNumber: serialNumber || null }),
        ...(assignedToId !== undefined && { assignedToId: assignedToId || null }),
        ...(emailAccountId !== undefined && { emailAccountId: emailAccountId || null }),
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
    const laptop = await prisma.laptop.findUnique({ where: { id } });
    if (!laptop) return Response.json({ error: "Not found" }, { status: 404 });
    await prisma.laptop.delete({ where: { id } });
    return Response.json({ ok: true });
  });
}
