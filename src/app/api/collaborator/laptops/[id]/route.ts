import { prisma } from "@/lib/db";
import { hasSecret } from "@/lib/secret-vault";
import { requireCollaboratorOrAdmin } from "@/lib/auth-server";
import { logAudit } from "@/lib/audit-log";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireCollaboratorOrAdmin();
    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { canViewLaptops: true, canViewEmployees: true },
    });
    if (!me) return Response.json({ error: "Sin permiso" }, { status: 403 });

    const { id } = await params;
    const laptop = await prisma.laptop.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, name: true } },
        emailAccount: { select: { id: true, email: true } },
      },
    });
    if (!laptop) return Response.json({ error: "No encontrado" }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    const canViewAssignedLaptopFromEmployee =
      Boolean(me.canViewEmployees) &&
      Boolean(employeeId) &&
      laptop.assignedToId === employeeId;

    if (!me.canViewLaptops && !canViewAssignedLaptopFromEmployee) {
      return Response.json({ error: "Sin permiso" }, { status: 403 });
    }
    return Response.json({
      id: laptop.id,
      name: laptop.name,
      equipmentCode: laptop.equipmentCode,
      serialNumber: laptop.serialNumber,
      hasPassword: hasSecret(laptop.password),
      equipmentType: laptop.equipmentType,
      brand: laptop.brand,
      model: laptop.model,
      color: laptop.color,
      accessories: laptop.accessories,
      generalState: laptop.generalState,
      software: laptop.software,
      observations: laptop.observations,
      maintenanceProvider: laptop.maintenanceProvider,
      imageUrl: laptop.imageUrl,
      imagePublicId: laptop.imagePublicId,
      assignedToId: laptop.assignedToId,
      assignedTo: laptop.assignedTo,
      emailAccountId: laptop.emailAccountId,
      emailAccount: laptop.emailAccount,
      createdAt: laptop.createdAt.toISOString(),
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

    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { canUpdateLaptops: true },
    });

    if (!me?.canUpdateLaptops) {
      return Response.json({ error: "Sin permiso" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, equipmentCode, password, serialNumber, equipmentType, brand, model, color, accessories, generalState, software, observations, maintenanceProvider, imageUrl, imagePublicId, assignedToId, emailAccountId } = body as {
      name?: string;
      equipmentCode?: string;
      password?: string;
      serialNumber?: string;
      equipmentType?: string;
      brand?: string;
      model?: string;
      color?: string;
      accessories?: string;
      generalState?: string;
      software?: string;
      observations?: string;
      maintenanceProvider?: string;
      imageUrl?: string;
      imagePublicId?: string;
      assignedToId?: string | null;
      emailAccountId?: string | null;
    };

    const laptop = await prisma.laptop.findUnique({ where: { id } });
    if (!laptop) return Response.json({ error: "No encontrado" }, { status: 404 });

    await prisma.laptop.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(equipmentCode !== undefined && { equipmentCode: equipmentCode || null }),
        ...(serialNumber !== undefined && { serialNumber: serialNumber || null }),
        ...(equipmentType !== undefined && { equipmentType: equipmentType || null }),
        ...(brand !== undefined && { brand: brand || null }),
        ...(model !== undefined && { model: model || null }),
        ...(color !== undefined && { color: color || null }),
        ...(accessories !== undefined && { accessories: accessories || null }),
        ...(generalState !== undefined && { generalState: generalState || null }),
        ...(software !== undefined && { software: software || null }),
        ...(observations !== undefined && { observations: observations || null }),
        ...(maintenanceProvider !== undefined && { maintenanceProvider: maintenanceProvider || null }),
        ...(imageUrl !== undefined && { imageUrl: imageUrl || null }),
        ...(imagePublicId !== undefined && { imagePublicId: imagePublicId || null }),
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

    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { canDeleteLaptops: true },
    });

    if (!me?.canDeleteLaptops) {
      return Response.json({ error: "Sin permiso" }, { status: 403 });
    }

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
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
