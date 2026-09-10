import { adminOrDeveloperHandler } from "@/lib/api-handler";

/**
 * GET /api/time-clock/whoami
 *
 * La IP pública tal como la ve ESTE servidor. Existe porque no coincide
 * necesariamente con lo que responde un `curl ifconfig.me` desde la terminal:
 * cada servicio ve la salida que le toca, y con Private Relay o CGNAT de por
 * medio pueden ser distintas. Para autorizar una red hay que capturar la que
 * ve la app, no la que ve otro sitio.
 */
export function GET(request: Request) {
  return adminOrDeveloperHandler(async () => {
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0].trim() ?? request.headers.get("x-real-ip");

    return Response.json({
      ip,
      // La cadena completa ayuda a ver si hay proxies de por medio.
      forwardedFor: forwarded,
    });
  });
}
