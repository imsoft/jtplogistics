import { prisma } from "@/lib/db";
import { requireCollaboratorOrAdmin } from "@/lib/auth-server";

async function checkPermission(userId: string) {
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { canViewPhones: true },
  });
  return me?.canViewPhones ?? false;
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
    const phone = await prisma.phone.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, name: true } },
        emailAccount: { select: { id: true, email: true } },
      },
    });
    if (!phone) return Response.json({ error: "No encontrado" }, { status: 404 });
    return Response.json({
      id: phone.id,
      name: phone.name,
      phoneNumber: phone.phoneNumber,
      password: phone.password,
      imei: phone.imei,
      assignedToId: phone.assignedToId,
      assignedTo: phone.assignedTo,
      emailAccountId: phone.emailAccountId,
      emailAccount: phone.emailAccount,
      createdAt: phone.createdAt.toISOString(),
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
