import { prisma } from "@/lib/db";
import { requireCollaboratorOrAdmin } from "@/lib/auth-server";
import { cleanMessageBody } from "@/lib/team-chat";
import { requireMember } from "@/lib/team-chat-server";

const PAGE = 200;

/** GET /api/team-chat/chats/[id]/messages — los últimos mensajes; al verlos quedan leídos. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCollaboratorOrAdmin();
    const { id } = await params;
    await requireMember(id, session.user.id);
    const [rows] = await Promise.all([
      prisma.teamChatMessage.findMany({
        where: { chatId: id },
        orderBy: { createdAt: "desc" },
        take: PAGE,
        include: { sender: { select: { id: true, name: true } } },
      }),
      prisma.teamChatMember.update({ where: { chatId_userId: { chatId: id, userId: session.user.id } }, data: { lastReadAt: new Date() } }),
    ]);
    return Response.json(
      rows.reverse().map((m) => ({
        id: m.id,
        body: m.body,
        createdAt: m.createdAt.toISOString(),
        senderId: m.senderId,
        senderName: m.sender?.name ?? "Ex colaborador",
      }))
    );
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[team-chat/chats/:id/messages] GET", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

/** POST /api/team-chat/chats/[id]/messages { body } */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCollaboratorOrAdmin();
    const { id } = await params;
    await requireMember(id, session.user.id);
    const data = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const clean = cleanMessageBody(data.body);
    if ("error" in clean) return Response.json({ error: clean.error }, { status: 400 });

    const now = new Date();
    const [message] = await prisma.$transaction([
      prisma.teamChatMessage.create({ data: { chatId: id, senderId: session.user.id, body: clean.body, createdAt: now } }),
      prisma.teamChat.update({ where: { id }, data: { lastMessageAt: now } }),
      // Lo que uno escribe ya lo leyó.
      prisma.teamChatMember.update({ where: { chatId_userId: { chatId: id, userId: session.user.id } }, data: { lastReadAt: now } }),
    ]);
    return Response.json({ id: message.id }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[team-chat/chats/:id/messages] POST", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
