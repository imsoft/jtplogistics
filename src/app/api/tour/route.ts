import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth-server";

/** Marca el tour de bienvenida como visto para el usuario de la sesión. */
export async function POST() {
  try {
    const session = await requireSession();

    await prisma.user.update({
      where: { id: session.user.id },
      data: { onboardingTourCompletedAt: new Date() },
    });

    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("Error al marcar el tour como visto:", e);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
