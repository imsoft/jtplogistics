import { prisma } from "@/lib/db";
import { adminHandler } from "@/lib/api-handler";

export function GET() {
  return adminHandler(async () => {
    const phones = await prisma.phone.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        assignedTo: { select: { id: true, name: true } },
        emailAccount: { select: { id: true, email: true } },
      },
    });
    return Response.json(
      phones.map((p) => ({
        id: p.id,
        name: p.name,
        phoneNumber: p.phoneNumber,
        password: p.password,
        imei: p.imei,
        assignedToId: p.assignedToId,
        assignedTo: p.assignedTo,
        emailAccountId: p.emailAccountId,
        emailAccount: p.emailAccount,
        createdAt: p.createdAt.toISOString(),
      }))
    );
  });
}

export function POST(request: Request) {
  return adminHandler(async () => {
    const body = await request.json();
    const { name, phoneNumber, password, imei, assignedToId, emailAccountId } = body as {
      name: string;
      phoneNumber?: string;
      password?: string;
      imei?: string;
      assignedToId?: string;
      emailAccountId?: string;
    };

    if (!name) {
      return Response.json({ error: "name es requerido" }, { status: 400 });
    }

    const phone = await prisma.phone.create({
      data: {
        name,
        phoneNumber: phoneNumber || null,
        password: password || null,
        imei: imei || null,
        assignedToId: assignedToId || null,
        emailAccountId: emailAccountId || null,
      },
    });

    return Response.json({ id: phone.id }, { status: 201 });
  });
}
