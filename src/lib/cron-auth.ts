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
