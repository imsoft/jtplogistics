import { prisma } from "@/lib/db";
import { adminHandler } from "@/lib/api-handler";

export function GET() {
  return adminHandler(async () => {
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
  return adminHandler(async () => {
    const body = await request.json();
    const { name, password, serialNumber, assignedToId, emailAccountId } = body as {
      name: string;
      password?: string;
      serialNumber?: string;
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
        assignedToId: assignedToId || null,
        emailAccountId: emailAccountId || null,
      },
    });

    return Response.json({ id: laptop.id }, { status: 201 });
  });
}
