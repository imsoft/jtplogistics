import { prisma } from "@/lib/db";
import { adminHandler } from "@/lib/api-handler";
import { logAudit } from "@/lib/audit-log";

export function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminHandler(async (session) => {
    const { id } = await params;
    const laptop = await prisma.laptop.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, name: true } },
        emailAccount: { select: { id: true, email: true } },
      },
    });
    if (!laptop) return Response.json({ error: "No encontrado" }, { status: 404 });
    return Response.json({
      id: laptop.id,
      name: laptop.name,
      password: laptop.password,
      serialNumber: laptop.serialNumber,
      equipmentType: laptop.equipmentType,
      brand: laptop.brand,
      model: laptop.model,
      accessories: laptop.accessories,
      generalState: laptop.generalState,
      software: laptop.software,
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
  return adminHandler(async (session) => {
    const { id } = await params;
    const body = await request.json();
    const { name, password, serialNumber, equipmentType, brand, model, accessories, generalState, software, assignedToId, emailAccountId } = body as {
      name?: string;
      password?: string;
      serialNumber?: string;
      equipmentType?: string;
      brand?: string;
      model?: string;
      accessories?: string;
      generalState?: string;
      software?: string;
      assignedToId?: string | null;
      emailAccountId?: string | null;
    };

    const laptop = await prisma.laptop.findUnique({ where: { id } });
    if (!laptop) return Response.json({ error: "No encontrado" }, { status: 404 });

    await prisma.laptop.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(password !== undefined && { password: password || null }),
        ...(serialNumber !== undefined && { serialNumber: serialNumber || null }),
        ...(equipmentType !== undefined && { equipmentType: equipmentType || null }),
        ...(brand !== undefined && { brand: brand || null }),
        ...(model !== undefined && { model: model || null }),
        ...(accessories !== undefined && { accessories: accessories || null }),
        ...(generalState !== undefined && { generalState: generalState || null }),
        ...(software !== undefined && { software: software || null }),
        ...(assignedToId !== undefined && { assignedToId: assignedToId || null }),
        ...(emailAccountId !== undefined && { emailAccountId: emailAccountId || null }),
      },
    });

    void logAudit({
      resource: "laptop",
      resourceId: id,
      resourceLabel: name ?? laptop.name ?? laptop.serialNumber ?? id,
      action: "updated",
      userId: session.user.id,
      userName: session.user.name,
    });

    return Response.json({ ok: true });
  });
}

export function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminHandler(async (session) => {
    const { id } = await params;
    const laptop = await prisma.laptop.findUnique({ where: { id } });
    if (!laptop) return Response.json({ error: "No encontrado" }, { status: 404 });
    await prisma.laptop.delete({ where: { id } });

    void logAudit({
      resource: "laptop",
      resourceId: id,
      resourceLabel: laptop.name ?? laptop.serialNumber ?? id,
      action: "deleted",
      userId: session.user.id,
      userName: session.user.name,
    });

    return Response.json({ ok: true });
  });
}
