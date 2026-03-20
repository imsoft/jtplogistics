import { prisma } from "@/lib/db";
import { adminHandler } from "@/lib/api-handler";
import { logAudit } from "@/lib/audit-log";

export function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminHandler(async (session) => {
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
  });
}

export function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminHandler(async (session) => {
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

    void logAudit({
      resource: "phone",
      resourceId: id,
      resourceLabel: name ?? phone.name ?? phone.phoneNumber ?? id,
      action: "updated",
      userId: session.user.id,
      userName: session.user.name,
    });

    return Response.json({ ok: true });
  });
}

export function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminHandler(async (session) => {
    const { id } = await params;
    const phone = await prisma.phone.findUnique({ where: { id } });
    if (!phone) return Response.json({ error: "No encontrado" }, { status: 404 });
    await prisma.phone.delete({ where: { id } });

    void logAudit({
      resource: "phone",
      resourceId: id,
      resourceLabel: phone.name ?? phone.phoneNumber ?? id,
      action: "deleted",
      userId: session.user.id,
      userName: session.user.name,
    });

    return Response.json({ ok: true });
  });
}
