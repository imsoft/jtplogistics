/**
 * Textos legales de las cotizaciones. Cada cotizador tiene los suyos: el
 * nacional en la fila "default" de quote_config y el internacional en la fila
 * "internacional" (términos de Aralo y notas de Swift/TransMex por omisión).
 */
import { prisma } from "@/lib/db";
import { TERMS_BULLETS, TERMS_CONTRACT, TERMS_PRIVACY, TERMS_LIMITS, TARIFF_TERMS } from "@/lib/constants/quote-terms";
import { INTL_TERMS_BULLETS, INTL_TERMS_NOTES } from "@/lib/constants/quote-terms-international";
import { bulletsToLexicalJson, textToLexicalJson } from "@/lib/utils/text-to-lexical";
import type { QuoteScope } from "@/lib/quote-scope";

export const QUOTE_CONFIG_FIELDS = ["bulletsJson", "contractJson", "privacyJson", "limitsJson", "tariffTermsJson"] as const;
export type QuoteConfigField = (typeof QUOTE_CONFIG_FIELDS)[number];

export function quoteConfigId(scope: QuoteScope): string {
  return scope === "internacional" ? "internacional" : "default";
}

export function quoteConfigDefaults(scope: QuoteScope): Record<QuoteConfigField, string> {
  const tariffTermsJson = bulletsToLexicalJson(TARIFF_TERMS);
  if (scope === "internacional") {
    // Sin aviso de privacidad ni límites aparte: esas páginas no salen.
    return {
      bulletsJson: bulletsToLexicalJson(INTL_TERMS_BULLETS),
      contractJson: bulletsToLexicalJson(INTL_TERMS_NOTES),
      privacyJson: "",
      limitsJson: "",
      tariffTermsJson,
    };
  }
  return {
    bulletsJson: bulletsToLexicalJson(TERMS_BULLETS),
    contractJson: textToLexicalJson(TERMS_CONTRACT),
    privacyJson: textToLexicalJson(TERMS_PRIVACY),
    limitsJson: textToLexicalJson(TERMS_LIMITS),
    tariffTermsJson,
  };
}

/** Los textos guardados del cotizador, con los de omisión donde no hay nada. */
export async function readQuoteConfig(scope: QuoteScope): Promise<Record<QuoteConfigField, string>> {
  const cfg = await prisma.quoteConfig.findUnique({ where: { id: quoteConfigId(scope) } });
  const d = quoteConfigDefaults(scope);
  return Object.fromEntries(QUOTE_CONFIG_FIELDS.map((f) => [f, cfg?.[f] || d[f]])) as Record<QuoteConfigField, string>;
}
