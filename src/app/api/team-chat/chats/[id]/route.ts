import { prisma } from "@/lib/db";
import { requireCollaboratorOrAdmin } from "@/lib/auth-server";
import { cleanGroupName, uniqueIds } from "@/lib/team-chat";
import { areTeamPeople, chatToJson, requireMember } from "@/lib/team-chat-server";

/** GET /api/team-chat/chats/[id] — la conversación con sus miembros. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCollaboratorOrAdmin();
    const { id } = await params;
    const member = await requireMember(id, session.user.id);
    return Response.json(chatToJson(member.chat, session.user.id, 0));
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[team-chat/chats/:id] GET", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

/**
 * PATCH /api/team-chat/chats/[id] — solo grupos, y solo sus miembros:
 * { name } lo renombra, { addMemberIds } agrega gente, { leave: true } sale.
 * Si sale el último, el grupo se borra.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCollaboratorOrAdmin();
    const { id } = await params;
    const member = await requireMember(id, session.user.id);
    if (member.chat.kind !== "group") return Response.json({ error: "Las conversaciones directas no se modifican." }, { status: 400 });
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    if (body.leave === true) {
      await prisma.teamChatMember.delete({ where: { chatId_userId: { chatId: id, userId: session.user.id } } });
      const left = await prisma.teamChatMember.count({ where: { chatId: id } });
      if (left === 0) await prisma.teamChat.delete({ where: { id } });
      return Response.json({ ok: true, left: true });
    }

    if (body.name !== undefined) {
      const name = cleanGroupName(body.name);
      if ("error" in name) return Response.json({ error: name.error }, { status: 400 });
      await prisma.teamChat.update({ where: { id }, data: { name: name.name } });
    }

    const add = uniqueIds(body.addMemberIds).filter((uid) => !member.chat.members.some((m) => m.userId === uid));
    if (add.length > 0) {
      if (!(await areTeamPeople(add))) return Response.json({ error: "Alguien de la lista no está en el equipo." }, { status: 400 });
      await prisma.teamChatMember.createMany({ data: add.map((userId) => ({ chatId: id, userId })), skipDuplicates: true });
    }
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[team-chat/chats/:id] PATCH", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
