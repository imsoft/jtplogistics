import { prisma } from "@/lib/db";
import { requireCollaboratorOrAdmin } from "@/lib/auth-server";

async function checkPermission(userId: string) {
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { canViewLaptops: true },
  });
  return me?.canViewLaptops ?? false;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireCollaboratorOrAdmin();
    if (!(await checkPermission(session.user.id))) {
      return Response.json({ error: "Sin permiso" }, { status: 403 });
    }

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
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PATCH() {
  return Response.json({ error: "Sin permiso" }, { status: 403 });
}

export async function DELETE() {
  return Response.json({ error: "Sin permiso" }, { status: 403 });
}
