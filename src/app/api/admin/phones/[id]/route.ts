import { prisma } from "@/lib/db";
import { adminHandler } from "@/lib/api-handler";
import { logAudit } from "@/lib/audit-log";

export function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminHandler(async (session) => {
    const { id } = await params;
    const phone = await prisma.phone.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            employeeProfile: { select: { department: true } },
          },
        },
        emailAccount: { select: { id: true, email: true } },
      },
    });
    if (!phone) return Response.json({ error: "No encontrado" }, { status: 404 });
    return Response.json({
      id: phone.id,
      name: phone.name,
      equipmentCode: phone.equipmentCode,
      phoneNumber: phone.phoneNumber,
      password: phone.password,
      imei: phone.imei,
      serialNumber: phone.serialNumber,
      brand: phone.brand,
      model: phone.model,
      color: phone.color,
      observations: phone.observations,
      maintenanceProvider: phone.maintenanceProvider,
      imageUrl: phone.imageUrl,
      imagePublicId: phone.imagePublicId,
      department: phone.assignedTo?.employeeProfile?.department ?? null,
      assignedToId: phone.assignedToId,
      assignedTo: phone.assignedTo
        ? { id: phone.assignedTo.id, name: phone.assignedTo.name }
        : null,
      emailAccountId: phone.emailAccountId,
      emailAccount: phone.emailAccount,
      createdAt: phone.createdAt.toISOString(),
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
    const { name, equipmentCode, phoneNumber, password, imei, serialNumber, brand, model, color, observations, maintenanceProvider, imageUrl, imagePublicId, assignedToId, emailAccountId } = body as {
      name?: string;
      equipmentCode?: string;
      phoneNumber?: string;
      password?: string;
      imei?: string;
      serialNumber?: string;
      brand?: string;
      model?: string;
      color?: string;
      observations?: string;
      maintenanceProvider?: string;
      imageUrl?: string;
      imagePublicId?: string;
      assignedToId?: string | null;
      emailAccountId?: string | null;
    };

    const phone = await prisma.phone.findUnique({ where: { id } });
    if (!phone) return Response.json({ error: "No encontrado" }, { status: 404 });

    await prisma.phone.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(equipmentCode !== undefined && { equipmentCode: equipmentCode || null }),
        ...(phoneNumber !== undefined && { phoneNumber: phoneNumber || null }),
        ...(password !== undefined && { password: password || null }),
        ...(imei !== undefined && { imei: imei || null }),
        ...(serialNumber !== undefined && { serialNumber: serialNumber || null }),
        ...(brand !== undefined && { brand: brand || null }),
        ...(model !== undefined && { model: model || null }),
        ...(color !== undefined && { color: color || null }),
        ...(observations !== undefined && { observations: observations || null }),
        ...(maintenanceProvider !== undefined && { maintenanceProvider: maintenanceProvider || null }),
        ...(imageUrl !== undefined && { imageUrl: imageUrl || null }),
        ...(imagePublicId !== undefined && { imagePublicId: imagePublicId || null }),
        ...(assignedToId !== undefined && { assignedToId: assignedToId || null }),
        ...(emailAccountId !== undefined && { emailAccountId: emailAccountId || null }),
      },
    });

    void logAudit({
      resource: "phone",
      resourceId: id,
      resourceLabel: name ?? phone.name ?? phone.phoneNumber ?? id,
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
    const phone = await prisma.phone.findUnique({ where: { id } });
    if (!phone) return Response.json({ error: "No encontrado" }, { status: 404 });
    await prisma.phone.delete({ where: { id } });

    void logAudit({
      resource: "phone",
      resourceId: id,
      resourceLabel: phone.name ?? phone.phoneNumber ?? id,
      action: "deleted",
      userId: session.user.id,
      userName: session.user.name,
    });

    return Response.json({ ok: true });
  });
}
