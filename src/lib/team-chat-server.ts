/**
 * Chat entre colaboradores, lado servidor: quién puede usarlo, la lista de
 * conversaciones con sus no leídos y la revisión de que uno sea miembro.
 */

import { prisma } from "@/lib/db";
import { ACTIVE_USERS } from "@/lib/offboarding";

export const STAFF_ROLES = ["admin", "collaborator"] as const;

/** Compañeros con quienes se puede hablar: dirección y colaboradores activos. */
export async function teamPeople() {
  return prisma.user.findMany({
    where: { role: { in: [...STAFF_ROLES] }, ...ACTIVE_USERS },
    select: { id: true, name: true, image: true },
    orderBy: { name: "asc" },
  });
}

/** Que todos los ids sean compañeros activos (no transportistas ni bajas). */
export async function areTeamPeople(ids: string[]): Promise<boolean> {
  if (ids.length === 0) return true;
  const n = await prisma.user.count({ where: { id: { in: ids }, role: { in: [...STAFF_ROLES] }, ...ACTIVE_USERS } });
  return n === ids.length;
}

/** Lanza 404 si el chat no existe o el usuario no es miembro. */
export async function requireMember(chatId: string, userId: string) {
  const member = await prisma.teamChatMember.findUnique({
    where: { chatId_userId: { chatId, userId } },
    include: { chat: { include: { members: { include: { user: { select: { id: true, name: true, image: true } } } } } } },
  });
  if (!member) {
    throw new Response(JSON.stringify({ error: "No encontrado" }), { status: 404, headers: { "Content-Type": "application/json" } });
  }
  return member;
}

/** No leídos por chat: mensajes de otros posteriores a lo último que leyó. */
export async function unreadByChat(userId: string): Promise<Map<string, number>> {
  const rows = await prisma.$queryRaw<{ chat_id: string; n: bigint }[]>`
    SELECT m.chat_id, COUNT(*)::bigint AS n
    FROM team_chat_messages m
    JOIN team_chat_members mb ON mb.chat_id = m.chat_id AND mb.user_id = ${userId}
    WHERE (m.sender_id IS NULL OR m.sender_id <> ${userId})
      AND (mb.last_read_at IS NULL OR m.created_at > mb.last_read_at)
    GROUP BY m.chat_id`;
  return new Map(rows.map((r) => [r.chat_id, Number(r.n)]));
}

/** Las conversaciones del usuario, la más reciente arriba, con su último mensaje y no leídos. */
export async function chatsFor(userId: string) {
  const [chats, unread] = await Promise.all([
    prisma.teamChat.findMany({
      where: { members: { some: { userId } } },
      include: {
        members: { include: { user: { select: { id: true, name: true, image: true } } } },
        messages: { orderBy: { createdAt: "desc" }, take: 1, include: { sender: { select: { id: true, name: true } } } },
      },
      orderBy: [{ lastMessageAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    }),
    unreadByChat(userId),
  ]);
  return chats.map((c) => chatToJson(c, userId, unread.get(c.id) ?? 0));
}

type ChatRow = {
  id: string;
  kind: string;
  name: string | null;
  createdAt: Date;
  members: { userId: string; user: { id: string; name: string; image: string | null } }[];
  messages?: { body: string; createdAt: Date; sender: { id: string; name: string } | null }[];
};

export function chatToJson(c: ChatRow, userId: string, unread: number) {
  const others = c.members.filter((m) => m.userId !== userId).map((m) => m.user);
  const last = c.messages?.[0];
  return {
    id: c.id,
    kind: c.kind as "direct" | "group",
    // En un directo, el título es el nombre del otro.
    title: c.kind === "group" ? (c.name ?? "Grupo") : (others[0]?.name ?? "Conversación"),
    members: c.members.map((m) => ({ id: m.user.id, name: m.user.name, image: m.user.image })),
    lastMessage: last
      ? { body: last.body, createdAt: last.createdAt.toISOString(), senderName: last.sender?.name ?? null, mine: last.sender?.id === userId }
      : null,
    unread,
  };
}

export type TeamChatJson = ReturnType<typeof chatToJson>;
