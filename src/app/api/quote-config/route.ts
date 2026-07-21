import { prisma } from "@/lib/db";
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

export async function GET() {
  try {
    const cfg = await prisma.quoteConfig.findUnique({ where: { id: "default" } });
    const d = defaults();
    return Response.json({
      bulletsJson: cfg?.bulletsJson || d.bulletsJson,
      contractJson: cfg?.contractJson || d.contractJson,
      privacyJson: cfg?.privacyJson || d.privacyJson,
      limitsJson: cfg?.limitsJson || d.limitsJson,
    });
  } catch (e) {
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
