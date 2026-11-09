import { prisma } from "@/lib/db";
import { requireCollaboratorOrAdmin } from "@/lib/auth-server";
import { cleanGroupName, directKey, uniqueIds } from "@/lib/team-chat";
import { areTeamPeople, chatsFor } from "@/lib/team-chat-server";

/** GET /api/team-chat/chats — mis conversaciones, con último mensaje y no leídos. */
export async function GET() {
  try {
    const session = await requireCollaboratorOrAdmin();
    return Response.json(await chatsFor(session.user.id));
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[team-chat/chats] GET", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

/**
 * POST /api/team-chat/chats
 * { kind: "direct", userId } abre (o reutiliza) la conversación con esa persona.
 * { kind: "group", name, memberIds } crea un grupo; quien lo crea queda dentro.
 */
export async function POST(request: Request) {
  try {
    const session = await requireCollaboratorOrAdmin();
    const me = session.user.id;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    if (body.kind === "direct") {
      const other = typeof body.userId === "string" ? body.userId : "";
      if (!other || other === me) return Response.json({ error: "Elige con quién hablar." }, { status: 400 });
      if (!(await areTeamPeople([other]))) return Response.json({ error: "Esa persona no está en el equipo." }, { status: 400 });
      const key = directKey(me, other);
      const chat = await prisma.teamChat.upsert({
        where: { directKey: key },
        update: {},
        create: {
          kind: "direct",
          directKey: key,
          createdById: me,
          members: { create: [{ userId: me }, { userId: other }] },
        },
        select: { id: true },
      });
      return Response.json({ id: chat.id }, { status: 201 });
    }

    if (body.kind === "group") {
      const name = cleanGroupName(body.name);
      if ("error" in name) return Response.json({ error: name.error }, { status: 400 });
      const memberIds = uniqueIds(body.memberIds).filter((id) => id !== me);
      if (memberIds.length === 0) return Response.json({ error: "Agrega al menos a una persona." }, { status: 400 });
      if (!(await areTeamPeople(memberIds))) return Response.json({ error: "Alguien de la lista no está en el equipo." }, { status: 400 });
      const chat = await prisma.teamChat.create({
        data: {
          kind: "group",
          name: name.name,
          createdById: me,
          members: { create: [me, ...memberIds].map((userId) => ({ userId, ...(userId === me && { lastReadAt: new Date() }) })) },
        },
        select: { id: true },
      });
      return Response.json({ id: chat.id }, { status: 201 });
    }

    return Response.json({ error: "Tipo de conversación no válido." }, { status: 400 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[team-chat/chats] POST", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
