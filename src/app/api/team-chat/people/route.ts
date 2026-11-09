import { requireCollaboratorOrAdmin } from "@/lib/auth-server";
import { teamPeople } from "@/lib/team-chat-server";

/** GET /api/team-chat/people — compañeros con quienes se puede hablar. */
export async function GET() {
  try {
    const session = await requireCollaboratorOrAdmin();
    const people = await teamPeople();
    return Response.json(people.filter((p) => p.id !== session.user.id));
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[team-chat/people] GET", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
