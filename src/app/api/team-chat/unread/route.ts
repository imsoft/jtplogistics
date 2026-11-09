import { requireCollaboratorOrAdmin } from "@/lib/auth-server";
import { unreadByChat } from "@/lib/team-chat-server";

/** GET /api/team-chat/unread — total de mensajes sin leer, para el contador del ícono. */
export async function GET() {
  try {
    const session = await requireCollaboratorOrAdmin();
    const byChat = await unreadByChat(session.user.id);
    let total = 0;
    for (const n of byChat.values()) total += n;
    return Response.json({ total });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[team-chat/unread] GET", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
