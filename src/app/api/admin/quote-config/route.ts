import { prisma } from "@/lib/db";
import { adminHandler } from "@/lib/api-handler";
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

export function GET() {
  return adminHandler(async () => {
    const cfg = await prisma.quoteConfig.findUnique({ where: { id: "default" } });
    const d = defaults();
    return Response.json({
      bulletsJson: cfg?.bulletsJson || d.bulletsJson,
      contractJson: cfg?.contractJson || d.contractJson,
      privacyJson: cfg?.privacyJson || d.privacyJson,
      limitsJson: cfg?.limitsJson || d.limitsJson,
    });
  });
}

export function PATCH(request: Request) {
  return adminHandler(async () => {
    const body = await request.json() as {
      bulletsJson?: string;
      contractJson?: string;
      privacyJson?: string;
      limitsJson?: string;
    };

    const fields = ["bulletsJson", "contractJson", "privacyJson", "limitsJson"] as const;
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

    const cfg = await prisma.quoteConfig.upsert({
      where: { id: "default" },
      create: { id: "default", ...body },
      update: body,
    });
    return Response.json({ ok: true, updatedAt: cfg.updatedAt });
  });
}
