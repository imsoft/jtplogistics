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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireCollaboratorOrAdmin();
    if (!(await checkPermission(session.user.id))) {
      return Response.json({ error: "Sin permiso" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, phoneNumber, password, imei, assignedToId, emailAccountId } = body as {
      name?: string;
      phoneNumber?: string;
      password?: string;
      imei?: string;
      assignedToId?: string | null;
      emailAccountId?: string | null;
    };

    const phone = await prisma.phone.findUnique({ where: { id } });
    if (!phone) return Response.json({ error: "No encontrado" }, { status: 404 });

    await prisma.phone.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(phoneNumber !== undefined && { phoneNumber: phoneNumber || null }),
        ...(password !== undefined && { password: password || null }),
        ...(imei !== undefined && { imei: imei || null }),
        ...(assignedToId !== undefined && { assignedToId: assignedToId || null }),
        ...(emailAccountId !== undefined && { emailAccountId: emailAccountId || null }),
      },
    });

    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireCollaboratorOrAdmin();
    if (!(await checkPermission(session.user.id))) {
      return Response.json({ error: "Sin permiso" }, { status: 403 });
    }

    const { id } = await params;
    const phone = await prisma.phone.findUnique({ where: { id } });
    if (!phone) return Response.json({ error: "No encontrado" }, { status: 404 });
    await prisma.phone.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
