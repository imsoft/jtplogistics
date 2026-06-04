import { prisma } from "@/lib/db";
import { requireCollaboratorOrAdmin } from "@/lib/auth-server";
import { logAudit } from "@/lib/audit-log";

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
        phoneNumber: p.phoneNumber,
        password: p.password,
        imei: p.imei,
        color: p.color,
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
      select: { canCreatePhones: true },
    });

    if (!me?.canCreatePhones) {
      return Response.json({ error: "Sin permiso" }, { status: 403 });
    }

    const body = await request.json();
    const { name, phoneNumber, password, imei, color, assignedToId, emailAccountId } = body as {
      name: string;
      phoneNumber?: string;
      password?: string;
      imei?: string;
      color?: string;
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
        color: color || null,
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
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
