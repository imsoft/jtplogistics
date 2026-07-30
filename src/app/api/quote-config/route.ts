import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth-server";
import { TERMS_BULLETS, TERMS_CONTRACT, TERMS_PRIVACY, TERMS_LIMITS } from "@/lib/constants/quote-terms";
import { bulletsToLexicalJson, textToLexicalJson } from "@/lib/utils/text-to-lexical";

function defaults() {
  return {
    bulletsJson: bulletsToLexicalJson(TERMS_BULLETS),
    contractJson: textToLexicalJson(TERMS_CONTRACT),
    privacyJson: textToLexicalJson(TERMS_PRIVACY),
    limitsJson: textToLexicalJson(TERMS_LIMITS),
  };
}

/**
 * Términos y textos legales que se imprimen en las cotizaciones.
 * Requiere sesión: los consumen las pantallas del cotizador (admin,
 * colaborador y transportista), nunca visitantes anónimos.
 */
export async function GET() {
  try {
    await requireSession();
    const cfg = await prisma.quoteConfig.findUnique({ where: { id: "default" } });
    const d = defaults();
    return Response.json({
      bulletsJson: cfg?.bulletsJson || d.bulletsJson,
      contractJson: cfg?.contractJson || d.contractJson,
      privacyJson: cfg?.privacyJson || d.privacyJson,
      limitsJson: cfg?.limitsJson || d.limitsJson,
    });
  } catch (e) {
    // El 401 de requireSession viaja como Response: hay que devolverlo tal cual,
    // si no el respaldo de abajo lo convertiría en un 200 con la configuración.
    if (e instanceof Response) return e;
    console.error("Error al obtener configuración de cotización:", e);
    const d = defaults();
    return Response.json({
      bulletsJson: d.bulletsJson,
      contractJson: d.contractJson,
      privacyJson: d.privacyJson,
      limitsJson: d.limitsJson,
    });
  }
}
