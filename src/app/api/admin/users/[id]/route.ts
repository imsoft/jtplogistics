import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { gateProviders } from "@/lib/provider-auth";
import { logAudit } from "@/lib/audit-log";

const DELETABLE_ROLES = ["carrier", "collaborator"] as const;
type DeletableRole = (typeof DELETABLE_ROLES)[number];

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, isCollaborator } = await gateProviders("canDeleteProviders");
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) {
      return Response.json({ error: "Usuario no encontrado." }, { status: 404 });
    }

    // Un colaborador con permiso solo puede eliminar proveedores (carriers).
    if (isCollaborator && user.role !== "carrier") {
      return Response.json(
        { error: "Solo se pueden eliminar proveedores." },
        { status: 403 }
      );
    }

    if (!DELETABLE_ROLES.includes(user.role as DeletableRole)) {
      return Response.json(
        { error: "Solo se pueden eliminar transportistas y colaboradores." },
        { status: 403 }
      );
    }

    await prisma.user.delete({ where: { id } });

    void logAudit({
      resource: "user",
      resourceId: id,
      resourceLabel: `${user.name} (${user.email})`,
      action: "deleted",
      userId: session.user.id,
      userName: session.user.name,
    });

    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
