import { prisma } from "@/lib/db";
import { adminHandler } from "@/lib/api-handler";
import { TERMS_BULLETS, TERMS_CONTRACT, TERMS_PRIVACY, TERMS_LIMITS, TARIFF_TERMS } from "@/lib/constants/quote-terms";
import { bulletsToLexicalJson, textToLexicalJson } from "@/lib/utils/text-to-lexical";
import { logAudit } from "@/lib/audit-log";

const QUOTE_CONFIG_LABELS: Record<string, string> = {
  bulletsJson: "Términos y condiciones",
  contractJson: "Términos del contrato",
  privacyJson: "Aviso de privacidad",
  limitsJson: "Límites de responsabilidad",
  tariffTermsJson: "Cláusulas del tarifario de proveedores",
};

function defaults() {
  return {
    bulletsJson: bulletsToLexicalJson(TERMS_BULLETS),
    contractJson: textToLexicalJson(TERMS_CONTRACT),
    privacyJson: textToLexicalJson(TERMS_PRIVACY),
    limitsJson: textToLexicalJson(TERMS_LIMITS),
    tariffTermsJson: bulletsToLexicalJson(TARIFF_TERMS),
  };
}

export function GET() {
  return adminHandler(async () => {
    const cfg = await prisma.quoteConfig.findUnique({ where: { id: "default" } });
    const d = defaults();
    return Response.json({
      bulletsJson: cfg?.bulletsJson || d.bulletsJson,
      contractJson: cfg?.contractJson || d.contractJson,
      privacyJson: cfg?.privacyJson || d.privacyJson,
      limitsJson: cfg?.limitsJson || d.limitsJson,
      tariffTermsJson: cfg?.tariffTermsJson || d.tariffTermsJson,
    });
  });
}

export function PATCH(request: Request) {
  return adminHandler(async (session) => {
    const body = await request.json() as {
      bulletsJson?: string;
      contractJson?: string;
      privacyJson?: string;
      limitsJson?: string;
      tariffTermsJson?: string;
    };

    const fields = ["bulletsJson", "contractJson", "privacyJson", "limitsJson", "tariffTermsJson"] as const;
    for (const field of fields) {
      const val = body[field];
      if (val !== undefined) {
        if (typeof val !== "string") {
          return Response.json({ error: `${field} debe ser string` }, { status: 400 });
        }
        try { JSON.parse(val); } catch {
          return Response.json({ error: `${field} no es JSON válido` }, { status: 400 });
        }
      }
    }

    const previous = await prisma.quoteConfig.findUnique({ where: { id: "default" } });
    const cfg = await prisma.quoteConfig.upsert({
      where: { id: "default" },
      create: { id: "default", ...body },
      update: body,
    });

    // Los textos legales son JSON largo: registramos qué sección cambió, no el contenido.
    const changes = fields
      .filter((f) => body[f] !== undefined && (previous?.[f] ?? "") !== (body[f] ?? ""))
      .map((f) => ({ field: f, label: QUOTE_CONFIG_LABELS[f], from: null, to: "Actualizado" }));
    if (changes.length > 0) {
      void logAudit({
        resource: "settings", resourceId: "quote-config", resourceLabel: "Textos legales del cotizador",
        action: "updated", userId: session.user.id, userName: session.user.name, changes,
      });
    }

    return Response.json({ ok: true, updatedAt: cfg.updatedAt });
  });
}
