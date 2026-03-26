import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireCarrier } from "@/lib/auth-server";
import { logAudit } from "@/lib/audit-log";

type RequestType = "edit_existing" | "add_new";

const REQUEST_TITLES: Record<RequestType, string> = {
  edit_existing: "Solicitud de desbloqueo para editar rutas",
  add_new: "Solicitud de desbloqueo para agregar rutas",
};

const REQUEST_BODIES: Record<RequestType, string> = {
  edit_existing: "El transportista solicita autorización para modificar rutas ya seleccionadas y sus targets.",
  add_new: "El transportista solicita autorización para agregar nuevas rutas a su selección.",
};

export async function POST(request: NextRequest) {
  try {
    const session = await requireCarrier();
    const body = await request.json();
    const type = body?.type as RequestType;

    if (type !== "edit_existing" && type !== "add_new") {
      return Response.json({ error: "Tipo de solicitud inválido" }, { status: 400 });
    }

    const admins = await prisma.user.findMany({
      where: { role: "admin" },
      select: { id: true },
    });

    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          type: "carrier_unlock_request",
          title: REQUEST_TITLES[type],
          body: `${REQUEST_BODIES[type]} Transportista: ${session.user.name}.`,
          href: `/admin/dashboard/users/${session.user.id}`,
          read: false,
        })),
      });
    }

    void logAudit({
      resource: "carrier_routes_unlock_request",
      resourceId: session.user.id,
      resourceLabel: session.user.name,
      action: "created",
      userId: session.user.id,
      userName: session.user.name,
    });

    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
