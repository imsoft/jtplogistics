import { prisma } from "@/lib/db";
import { adminHandler } from "@/lib/api-handler";
import { parseQuoteScope } from "@/lib/quote-scope";
import { QUOTE_CONFIG_FIELDS, quoteConfigId, readQuoteConfig } from "@/lib/quote-config-server";
import { logAudit } from "@/lib/audit-log";

const QUOTE_CONFIG_LABELS: Record<string, string> = {
  bulletsJson: "Términos y condiciones",
  contractJson: "Términos del contrato",
  privacyJson: "Aviso de privacidad",
  limitsJson: "Límites de responsabilidad",
  tariffTermsJson: "Cláusulas del tarifario de proveedores",
};

/** GET ?scope=nacional|internacional — los textos de ese cotizador. */
export function GET(request: Request) {
  return adminHandler(async () => Response.json(await readQuoteConfig(parseQuoteScope(new URL(request.url).searchParams.get("scope")))));
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

    const fields = QUOTE_CONFIG_FIELDS;
    const scope = parseQuoteScope(new URL(request.url).searchParams.get("scope"));
    const id = quoteConfigId(scope);
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

    const previous = await prisma.quoteConfig.findUnique({ where: { id } });
    const cfg = await prisma.quoteConfig.upsert({
      where: { id },
      create: { id, ...body },
      update: body,
    });

    // Los textos legales son JSON largo: registramos qué sección cambió, no el contenido.
    const changes = fields
      .filter((f) => body[f] !== undefined && (previous?.[f] ?? "") !== (body[f] ?? ""))
      .map((f) => ({ field: f, label: QUOTE_CONFIG_LABELS[f], from: null, to: "Actualizado" }));
    if (changes.length > 0) {
      void logAudit({
        resource: "settings", resourceId: `quote-config-${scope}`, resourceLabel: scope === "internacional" ? "Textos legales del cotizador internacional" : "Textos legales del cotizador",
        action: "updated", userId: session.user.id, userName: session.user.name, changes,
      });
    }

    return Response.json({ ok: true, updatedAt: cfg.updatedAt });
  });
}
