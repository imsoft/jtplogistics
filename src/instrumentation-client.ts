import { initBotId } from "botid/client/core";
import { BOT_PROTECTED_AUTH_PATHS } from "@/lib/bot-protection";

// Vercel BotID: marca las peticiones de iniciar sesión, registrarse y recuperar
// la contraseña para que el servidor sepa si vienen de una persona.
initBotId({
  protect: BOT_PROTECTED_AUTH_PATHS.map((path) => ({ path, method: "POST" })),
});
