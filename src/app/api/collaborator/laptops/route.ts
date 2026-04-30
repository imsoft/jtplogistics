import { prisma } from "@/lib/db";
import { requireCollaboratorOrAdmin } from "@/lib/auth-server";

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
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST() {
  return Response.json({ error: "Sin permiso" }, { status: 403 });
}
