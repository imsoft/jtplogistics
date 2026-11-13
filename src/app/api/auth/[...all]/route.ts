import { checkBotId } from "botid/server";
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { botIdMode, isBotProtectedPath } from "@/lib/bot-protection";

const handler = toNextJsHandler(auth);

export const GET = handler.GET;

/**
 * Iniciar sesión, registrarse y recuperar la contraseña pasan antes por
 * Vercel BotID (ver lib/bot-protection.ts para los modos).
 */
export async function POST(request: Request) {
  const mode = botIdMode(process.env.BOTID_MODE);
  const { pathname } = new URL(request.url);
  if (mode !== "off" && isBotProtectedPath(pathname)) {
    try {
      const verdict = await checkBotId();
      if (verdict.isBot) {
        console.warn(`[botid] bot ${mode === "enforce" ? "bloqueado" : "detectado (sin bloquear)"} en ${pathname}`);
        if (mode === "enforce") {
          return Response.json({ error: "No pudimos verificar tu solicitud. Recarga la página e inténtalo de nuevo." }, { status: 403 });
        }
      }
    } catch (e) {
      // Si BotID no responde no se bloquea a nadie: el límite de intentos sigue activo.
      console.error("[botid] no se pudo verificar", e);
    }
  }
  return handler.POST(request);
}
