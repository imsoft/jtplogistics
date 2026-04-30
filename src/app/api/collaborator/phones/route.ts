import { prisma } from "@/lib/db";
import { requireCollaboratorOrAdmin } from "@/lib/auth-server";

export async function GET() {
  try {
    const session = await requireCollaboratorOrAdmin();

    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { canViewPhones: true },
    });

    if (!me?.canViewPhones) {
      return Response.json({ error: "Sin permiso" }, { status: 403 });
    }

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
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST() {
  return Response.json({ error: "Sin permiso" }, { status: 403 });
}
