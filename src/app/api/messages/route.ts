import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth-server";
import { notify, notifyRole } from "@/lib/notify";
import { logAudit } from "@/lib/audit-log";

function isStaff(role: string) {
  return role === "admin" || role === "collaborator";
}

// GET /api/messages?carrierId=xxx
// carrier: solo sus propios mensajes
// collaborator/admin: cualquier carrierId
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }

    const { role, id: userId } = session.user as { role: string; id: string };
    const carrierId = request.nextUrl.searchParams.get("carrierId");

    let targetCarrierId: string;

    if (role === "carrier") {
      targetCarrierId = userId;
    } else if (isStaff(role)) {
      if (!carrierId) {
        return Response.json({ error: "carrierId requerido" }, { status: 400 });
      }
      targetCarrierId = carrierId;
    } else {
      return Response.json({ error: "Prohibido" }, { status: 403 });
    }

    const messages = await prisma.message.findMany({
      where: { carrierId: targetCarrierId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        senderId: true,
        senderName: true,
        senderRole: true,
        body: true,
        createdAt: true,
      },
    });

    return Response.json(
      messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }))
    );
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST /api/messages
// body: { carrierId?: string, body: string }
// carrier: carrierId auto, no body.carrierId needed
// collaborator/admin: carrierId requerido
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }

    const { role, id: userId, name: userName } = session.user as {
      role: string;
      id: string;
      name: string;
    };

    const body = await request.json();
    const text = String(body.body ?? "").trim();

    if (!text) {
      return Response.json({ error: "El mensaje no puede estar vacío" }, { status: 400 });
    }

    let carrierId: string;
    let senderRole: string;

    if (role === "carrier") {
      carrierId = userId;
      senderRole = "carrier";
    } else if (isStaff(role)) {
      const cid = String(body.carrierId ?? "").trim();
      if (!cid) {
        return Response.json({ error: "carrierId requerido" }, { status: 400 });
      }
      carrierId = cid;
      senderRole = "staff";
    } else {
      return Response.json({ error: "Prohibido" }, { status: 403 });
    }

    // Verify carrier exists
    const carrier = await prisma.user.findUnique({
      where: { id: carrierId },
      select: { id: true, role: true },
    });

    if (!carrier || carrier.role !== "carrier") {
      return Response.json({ error: "Transportista no encontrado" }, { status: 404 });
    }

    const message = await prisma.message.create({
      data: {
        carrierId,
        senderId: userId,
        senderName: userName,
        senderRole,
        body: text,
      },
    });

    // Notificaciones
    if (senderRole === "carrier") {
      // Carrier escribe → notificar a todos los admin y colaboradores
      void notifyRole("admin", {
        type: "new_message",
        title: `Mensaje de ${userName}`,
        body: text.slice(0, 80),
        href: `/admin/dashboard/messages?carrierId=${carrierId}`,
      });
      void notifyRole("collaborator", {
        type: "new_message",
        title: `Mensaje de ${userName}`,
        body: text.slice(0, 80),
        href: `/collaborator/dashboard/messages?carrierId=${carrierId}`,
      });
    } else {
      // Staff escribe → notificar al carrier
      void notify({
        userId: carrierId,
        type: "new_message",
        title: `Respuesta de ${userName}`,
        body: text.slice(0, 80),
        href: `/carrier/dashboard/messages`,
      });
    }

    void logAudit({
      resource: "message", resourceId: message.id, resourceLabel: `Mensaje a ${carrierId}`,
      action: "created", userId, userName,
    });

    return Response.json({
      id: message.id,
      senderId: message.senderId,
      senderName: message.senderName,
      senderRole: message.senderRole,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
    });
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
