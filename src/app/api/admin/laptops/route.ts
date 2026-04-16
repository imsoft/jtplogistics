import { prisma } from "@/lib/db";
import { adminHandler } from "@/lib/api-handler";
import { logAudit } from "@/lib/audit-log";

export function GET() {
  return adminHandler(async (session) => {
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
        password: l.password,
        serialNumber: l.serialNumber,
        equipmentType: l.equipmentType,
        brand: l.brand,
        model: l.model,
        accessories: l.accessories,
        generalState: l.generalState,
        software: l.software,
        assignedToId: l.assignedToId,
        assignedTo: l.assignedTo,
        emailAccountId: l.emailAccountId,
        emailAccount: l.emailAccount,
        createdAt: l.createdAt.toISOString(),
      }))
    );
  });
}

export function POST(request: Request) {
  return adminHandler(async (session) => {
    const body = await request.json();
    const { name, password, serialNumber, equipmentType, brand, model, accessories, generalState, software, assignedToId, emailAccountId } = body as {
      name: string;
      password?: string;
      serialNumber?: string;
      equipmentType?: string;
      brand?: string;
      model?: string;
      accessories?: string;
      generalState?: string;
      software?: string;
      assignedToId?: string;
      emailAccountId?: string;
    };

    if (!name) {
      return Response.json({ error: "name es requerido" }, { status: 400 });
    }

    const laptop = await prisma.laptop.create({
      data: {
        name,
        password: password || null,
        serialNumber: serialNumber || null,
        equipmentType: equipmentType || null,
        brand: brand || null,
        model: model || null,
        accessories: accessories || null,
        generalState: generalState || null,
        software: software || null,
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
  });
}
