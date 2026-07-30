import { prisma } from "@/lib/db";
import { encryptSecret, hasSecret } from "@/lib/secret-vault";
import { adminHandler } from "@/lib/api-handler";
import { logAudit } from "@/lib/audit-log";

export function GET() {
  return adminHandler(async (session) => {
    const phones = await prisma.phone.findMany({
      orderBy: { createdAt: "desc" },
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
    return Response.json(
      phones.map((p) => ({
        id: p.id,
        name: p.name,
        equipmentCode: p.equipmentCode,
        phoneNumber: p.phoneNumber,
        hasPassword: hasSecret(p.password),
        imei: p.imei,
        serialNumber: p.serialNumber,
        brand: p.brand,
        model: p.model,
        color: p.color,
        observations: p.observations,
        maintenanceProvider: p.maintenanceProvider,
        imageUrl: p.imageUrl,
        imagePublicId: p.imagePublicId,
        department: p.assignedTo?.employeeProfile?.department ?? null,
        assignedToId: p.assignedToId,
        assignedTo: p.assignedTo
          ? { id: p.assignedTo.id, name: p.assignedTo.name }
          : null,
        emailAccountId: p.emailAccountId,
        emailAccount: p.emailAccount,
        createdAt: p.createdAt.toISOString(),
      }))
    );
  });
}

export function POST(request: Request) {
  return adminHandler(async (session) => {
    const body = await request.json();
    const { name, equipmentCode, phoneNumber, password, imei, serialNumber, brand, model, color, observations, maintenanceProvider, imageUrl, imagePublicId, assignedToId, emailAccountId } = body as {
      name: string;
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
      assignedToId?: string;
      emailAccountId?: string;
    };

    if (!name) {
      return Response.json({ error: "name es requerido" }, { status: 400 });
    }

    const phone = await prisma.phone.create({
      data: {
        name,
        equipmentCode: equipmentCode || null,
        phoneNumber: phoneNumber || null,
        password: encryptSecret(password),
        imei: imei || null,
        serialNumber: serialNumber || null,
        brand: brand || null,
        model: model || null,
        color: color || null,
        observations: observations || null,
        maintenanceProvider: maintenanceProvider || null,
        imageUrl: imageUrl || null,
        imagePublicId: imagePublicId || null,
        assignedToId: assignedToId || null,
        emailAccountId: emailAccountId || null,
      },
    });

    void logAudit({
      resource: "phone",
      resourceId: phone.id,
      resourceLabel: name,
      action: "created",
      userId: session.user.id,
      userName: session.user.name,
    });

    return Response.json({ id: phone.id }, { status: 201 });
  });
}
