import { requireSession } from "@/lib/auth-server";
import { parseQuoteScope } from "@/lib/quote-scope";
import { quoteConfigDefaults, readQuoteConfig } from "@/lib/quote-config-server";

/**
 * Términos y textos legales que se imprimen en las cotizaciones.
 * GET ?scope=nacional|internacional. Requiere sesión: los consumen las
 * pantallas del cotizador (admin, colaborador y transportista), nunca
 * visitantes anónimos.
 */
export async function GET(request: Request) {
  const scope = parseQuoteScope(new URL(request.url).searchParams.get("scope"));
  try {
    await requireSession();
    return Response.json(await readQuoteConfig(scope));
  } catch (e) {
    // El 401 de requireSession viaja como Response: hay que devolverlo tal cual,
    // si no el respaldo de abajo lo convertiría en un 200 con la configuración.
    if (e instanceof Response) return e;
    console.error("Error al obtener configuración de cotización:", e);
    return Response.json(quoteConfigDefaults(scope));
  }
}
