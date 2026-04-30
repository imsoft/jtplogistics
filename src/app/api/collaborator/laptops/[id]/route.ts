import { prisma } from "@/lib/db";
import { requireCollaboratorOrAdmin } from "@/lib/auth-server";

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
