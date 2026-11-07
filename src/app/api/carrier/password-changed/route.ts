import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth-server";
import { passwordRecentlyChanged } from "@/lib/provider-onboarding-account";

/**
 * POST /api/carrier/password-changed
 * Quita el cambio obligatorio de contraseña de quien tiene la sesión, una vez
 * que ya la cambió con Better Auth. No toca nada más.
 */
export async function POST() {
  try {
    const session = await requireSession();
    const credential = await prisma.account.findFirst({
      where: { userId: session.user.id, providerId: "credential" },
      select: { createdAt: true, updatedAt: true },
    });
    if (!credential || !passwordRecentlyChanged(credential, new Date())) {
      return Response.json({ error: "Primero cambia tu contraseña." }, { status: 409 });
    }
    await prisma.user.update({ where: { id: session.user.id }, data: { mustChangePassword: false } });
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[carrier/password-changed] POST", e);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
