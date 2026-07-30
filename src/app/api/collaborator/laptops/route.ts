import { prisma } from "@/lib/db";
import { hasSecret } from "@/lib/secret-vault";
import { requireCollaboratorOrAdmin } from "@/lib/auth-server";
import { logAudit } from "@/lib/audit-log";

export async function GET() {
  try {
    const session = await requireCollaboratorOrAdmin();

    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { canViewLaptops: true },
    });

    if (!me?.canViewLaptops) {
      return Response.json({ error: "Sin permiso" }, { status: 403 });
    }

    const laptops = await prisma.laptop.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        assignedTo: { select: { id: true, name: true } },
        emailAccount: { select: { id: true, email: true } },
      },
    });

    return Response.json(
      laptops.map((l) => ({
        id: l.id,
        name: l.name,
        equipmentCode: l.equipmentCode,
        serialNumber: l.serialNumber,
        hasPassword: hasSecret(l.password),
        equipmentType: l.equipmentType,
        brand: l.brand,
        model: l.model,
        color: l.color,
        accessories: l.accessories,
        generalState: l.generalState,
        software: l.software,
        observations: l.observations,
        maintenanceProvider: l.maintenanceProvider,
        imageUrl: l.imageUrl,
        imagePublicId: l.imagePublicId,
        assignedToId: l.assignedToId,
        assignedTo: l.assignedTo,
        emailAccountId: l.emailAccountId,
        emailAccount: l.emailAccount,
        createdAt: l.createdAt.toISOString(),
      }))
    );
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireCollaboratorOrAdmin();

    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { canCreateLaptops: true },
    });

    if (!me?.canCreateLaptops) {
      return Response.json({ error: "Sin permiso" }, { status: 403 });
    }

    const body = await request.json();
    const { name, equipmentCode, password, serialNumber, equipmentType, brand, model, color, accessories, generalState, software, observations, maintenanceProvider, imageUrl, imagePublicId, assignedToId, emailAccountId } = body as {
      name: string;
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
      assignedToId?: string;
      emailAccountId?: string;
    };

    if (!name) {
      return Response.json({ error: "name es requerido" }, { status: 400 });
    }

    const laptop = await prisma.laptop.create({
      data: {
        name,
        equipmentCode: equipmentCode || null,
        serialNumber: serialNumber || null,
        equipmentType: equipmentType || null,
        brand: brand || null,
        model: model || null,
        color: color || null,
        accessories: accessories || null,
        generalState: generalState || null,
        software: software || null,
        observations: observations || null,
        maintenanceProvider: maintenanceProvider || null,
        imageUrl: imageUrl || null,
        imagePublicId: imagePublicId || null,
        assignedToId: assignedToId || null,
        emailAccountId: emailAccountId || null,
      },
    });

    void logAudit({
      resource: "laptop",
      resourceId: laptop.id,
      resourceLabel: name,
      action: "created",
      userId: session.user.id,
      userName: session.user.name,
    });

    return Response.json({ id: laptop.id }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
