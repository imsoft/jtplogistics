import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit-log";
import { requireCarrierAccount } from "@/lib/carrier-account";
import { CARRIER_MEMBER_PERMISSIONS, pickMemberPermissions } from "@/lib/carrier-permissions";

/** El usuario, solo si es de la empresa de quien pregunta. */
async function loadOwnMember(carrierId: string, id: string) {
  return prisma.user.findFirst({
    where: { id, parentCarrierId: carrierId },
    select: { id: true, name: true, memberRevokedAt: true },
  });
}

/** PATCH /api/carrier/members/[id] — cambia los permisos. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { carrierId, userId, session } = await requireCarrierAccount("manageUsers");
    const { id } = await params;
    const member = await loadOwnMember(carrierId, id);
    if (!member) return Response.json({ error: "No encontrado" }, { status: 404 });
    if (member.memberRevokedAt) {
      return Response.json(
        { error: "Ese usuario ya no tiene acceso. Vuelve a darlo de alta para devolvérselo." },
        { status: 409 }
      );
    }

    const permissions = pickMemberPermissions(
      (await request.json().catch(() => ({}))) as Record<string, unknown>
    );
    await prisma.user.update({ where: { id }, data: permissions });

    const changed = CARRIER_MEMBER_PERMISSIONS.filter((p) => p.key in permissions).map(
      (p) => `${p.label}: ${permissions[p.key] ? "sí" : "no"}`
    );
    void logAudit({
      resource: "carrier_member",
      resourceId: id,
      resourceLabel: member.name,
      action: "updated",
      userId,
      userName: session.user.name,
      changes: [{ field: "permissions", label: "Permisos", from: null, to: changed.join(", ") }],
    });

    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[carrier/members/:id] PATCH", e);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

/**
 * DELETE /api/carrier/members/[id] — le quita el acceso.
 *
 * No borra al usuario: sus mensajes a JTP se borrarían en cascada y la
 * conversación de la empresa perdería registro. Se le borran la contraseña y
 * las sesiones, que es lo que de verdad lo deja fuera.
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { carrierId, userId, session } = await requireCarrierAccount("manageUsers");
    const { id } = await params;
    const member = await loadOwnMember(carrierId, id);
    if (!member) return Response.json({ error: "No encontrado" }, { status: 404 });

    await prisma.$transaction([
      prisma.user.update({ where: { id }, data: { memberRevokedAt: new Date() } }),
      prisma.account.deleteMany({ where: { userId: id, providerId: "credential" } }),
      prisma.session.deleteMany({ where: { userId: id } }),
    ]);

    void logAudit({
      resource: "carrier_member",
      resourceId: id,
      resourceLabel: member.name,
      action: "deleted",
      userId,
      userName: session.user.name,
    });

    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[carrier/members/:id] DELETE", e);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
