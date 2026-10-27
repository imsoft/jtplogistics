import { prisma } from "@/lib/db";

/**
 * Los avisos automáticos (crons de Vercel) solo corren con la clave
 * CRON_SECRET. Si la variable no está configurada se rechaza todo: dejarlos
 * abiertos permitiría a cualquiera dispararlos en bucle (correos a todo el
 * equipo, notificaciones).
 */
export function cronUnauthorized(request: Request): Response | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron] Falta CRON_SECRET: el aviso no se ejecuta.");
    return Response.json({ error: "No configurado" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  return null;
}

/**
 * Si el aviso diario ya salió hoy. Vercel puede reintentar un cron y
 * dispararlo a mano también lo repetía: sin esto, cada llamada volvía a mandar
 * correos y notificaciones a todo el equipo. Se reconoce por las
 * notificaciones de ese tipo creadas en las últimas 20 horas.
 */
export async function ranRecently(notificationType: string): Promise<boolean> {
  const since = new Date(Date.now() - 20 * 3_600_000);
  const hit = await prisma.notification.findFirst({ where: { type: notificationType, createdAt: { gte: since } }, select: { id: true } });
  return hit !== null;
}
