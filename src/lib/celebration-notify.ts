/**
 * Felicitación personal del día: correo a quien cumple años o aniversario,
 * más su notificación en el dashboard. Fire-and-forget.
 */

import { prisma } from "@/lib/db";
import { notify } from "@/lib/notify";
import { sendEmail } from "@/lib/email";
import { appUrl } from "@/lib/email-layout";
import { buildCelebrationEmail, firstName } from "@/lib/celebration-email";
import { dashboardPrefix } from "@/lib/mural-notify";
import type { MuralCelebration } from "@/types/mural.types";

/**
 * Felicita a cada persona de `celebrations`. Devuelve cuántos correos salieron.
 */
export async function sendCelebrationGreetings(
  celebrations: MuralCelebration[]
): Promise<number> {
  if (celebrations.length === 0) return 0;

  try {
    const users = await prisma.user.findMany({
      where: { id: { in: celebrations.map((c) => c.userId) } },
      select: { id: true, email: true, role: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));
    const base = appUrl();

    const results = await Promise.allSettled(
      celebrations.map(async (celebration) => {
        const user = byId.get(celebration.userId);
        if (!user) return;

        const muralPath = `${dashboardPrefix(user.role)}/dashboard/mural`;
        const { subject, html, text } = buildCelebrationEmail({
          name: celebration.name,
          kind: celebration.kind,
          years: celebration.years,
          base,
          muralPath,
        });

        await notify({
          userId: user.id,
          type: `celebration_${celebration.kind}`,
          title:
            celebration.kind === "birthday"
              ? `¡Feliz cumpleaños, ${firstName(celebration.name)}! 🎂`
              : `¡Felicidades por tu aniversario, ${firstName(celebration.name)}! 🎉`,
          body:
            celebration.kind === "birthday"
              ? "Todo el equipo de JTP Logistics te desea un día increíble."
              : "Gracias por todo lo que aportas al equipo.",
          href: muralPath,
        });

        await sendEmail({ to: user.email, subject, html, text });
      })
    );

    const failed = results.filter((r) => r.status === "rejected");
    for (const f of failed) {
      console.error("[celebration-notify] Falló una felicitación:", f.reason);
    }

    return results.length - failed.length;
  } catch (e) {
    console.error("[celebration-notify] Error:", e);
    return 0;
  }
}
