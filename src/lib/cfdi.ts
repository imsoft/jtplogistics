/**
 * Lectura del XML de una factura (CFDI 3.3 y 4.0) para capturarla sin
 * teclear: emisor, receptor, folio, folio fiscal e importes con sus
 * impuestos y retenciones.
 *
 * Puro, para poder probarlo. No resuelve entidades externas del XML.
 */

import { XMLParser } from "fast-xml-parser";
import { r2, type BillingKind, type Currency } from "@/lib/billing";

export interface CfdiData {
  version: string;
  /** I ingreso, E egreso (nota de crédito), P pago, T traslado, N nómina. */
  type: string;
  uuid: string | null;
  series: string | null;
  folio: string | null;
  /** "YYYY-MM-DD" */
  issueDate: string;
  currency: Currency;
  exchangeRate: number;
  /** Subtotal menos descuento: la base de los impuestos. */
  subtotal: number;
  iva: number;
  ivaRate: number;
  ivaWithheld: number;
  isrWithheld: number;
  total: number;
  paymentMethod: "PUE" | "PPD";
  paymentForm: string | null;
  issuer: { rfc: string; name: string | null };
  receiver: { rfc: string; name: string | null };
  concept: string | null;
  hasCartaPorte: boolean;
  /** Folios fiscales de los CFDI relacionados (la factura a la que aplica una nota de crédito). */
  related: string[];
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  removeNSPrefix: true,
  processEntities: false,
  parseAttributeValue: false,
  parseTagValue: false,
});

const list = <T,>(v: T | T[] | undefined): T[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
const n = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

type Node = Record<string, unknown>;

/** Lee un CFDI. Devuelve el error en palabras si el archivo no es una factura válida. */
export function parseCfdi(xml: string): { ok: true; data: CfdiData } | { ok: false; error: string } {
  let doc: Node;
  try {
    doc = parser.parse(xml) as Node;
  } catch {
    return { ok: false, error: "El archivo no es un XML válido." };
  }
  const c = doc.Comprobante as Node | undefined;
  if (!c || typeof c !== "object") return { ok: false, error: "El XML no es una factura (CFDI)." };

  const emisor = (c.Emisor ?? {}) as Node;
  const receptor = (c.Receptor ?? {}) as Node;
  const issuerRfc = str(emisor.Rfc);
  const receiverRfc = str(receptor.Rfc);
  if (!issuerRfc || !receiverRfc) return { ok: false, error: "El XML no trae el RFC del emisor o del receptor." };

  const currencyRaw = str(c.Moneda) ?? "MXN";
  if (currencyRaw !== "MXN" && currencyRaw !== "USD") {
    return { ok: false, error: currencyRaw === "XXX" ? "Es un complemento de pago, no una factura." : `Moneda ${currencyRaw} no soportada (solo MXN y USD).` };
  }

  const complemento = (c.Complemento ?? {}) as Node;
  const complementos = list(complemento as Node | Node[]);
  const tfd = complementos.map((x) => x.TimbreFiscalDigital as Node | undefined).find(Boolean);
  const hasCartaPorte = complementos.some((x) => Object.keys(x).some((k) => k.startsWith("CartaPorte")));

  const impuestos = (c.Impuestos ?? {}) as Node;
  const traslados = list((impuestos.Traslados as Node | undefined)?.Traslado as Node | Node[] | undefined);
  const retenciones = list((impuestos.Retenciones as Node | undefined)?.Retencion as Node | Node[] | undefined);
  const ivaTraslados = traslados.filter((t) => str(t.Impuesto) === "002");
  const iva = r2(ivaTraslados.reduce((s, t) => s + n(t.Importe), 0));
  const ivaRate = ivaTraslados.length ? n(ivaTraslados[0].TasaOCuota) : 0;
  const ivaWithheld = r2(retenciones.filter((t) => str(t.Impuesto) === "002").reduce((s, t) => s + n(t.Importe), 0));
  const isrWithheld = r2(retenciones.filter((t) => str(t.Impuesto) === "001").reduce((s, t) => s + n(t.Importe), 0));

  const conceptos = list((c.Conceptos as Node | undefined)?.Concepto as Node | Node[] | undefined);
  const descriptions = conceptos.map((x) => str(x.Descripcion)).filter((x): x is string => Boolean(x));
  const concept = descriptions.length ? descriptions.slice(0, 3).join(" · ").slice(0, 300) : null;

  const related = list(c.CfdiRelacionados as Node | Node[] | undefined)
    .flatMap((g) => list(g.CfdiRelacionado as Node | Node[] | undefined))
    .map((r) => str(r.UUID)?.toUpperCase())
    .filter((u): u is string => Boolean(u));

  const fecha = str(c.Fecha) ?? "";
  if (!/^\d{4}-\d{2}-\d{2}/.test(fecha)) return { ok: false, error: "El XML no trae una fecha válida." };

  return {
    ok: true,
    data: {
      version: str(c.Version) ?? "",
      type: str(c.TipoDeComprobante) ?? "",
      uuid: str(tfd?.UUID)?.toUpperCase() ?? null,
      series: str(c.Serie)?.toUpperCase() ?? null,
      folio: str(c.Folio)?.toUpperCase() ?? null,
      issueDate: fecha.slice(0, 10),
      currency: currencyRaw,
      exchangeRate: currencyRaw === "USD" ? n(c.TipoCambio) || 1 : 1,
      subtotal: r2(n(c.SubTotal) - n(c.Descuento)),
      iva,
      ivaRate,
      ivaWithheld,
      isrWithheld,
      total: r2(n(c.Total)),
      paymentMethod: str(c.MetodoPago) === "PUE" ? "PUE" : "PPD",
      paymentForm: str(c.FormaPago),
      issuer: { rfc: issuerRfc.toUpperCase(), name: str(emisor.Nombre) },
      receiver: { rfc: receiverRfc.toUpperCase(), name: str(receptor.Nombre) },
      concept,
      hasCartaPorte,
      related,
    },
  };
}

/**
 * Si el CFDI sirve para esta lista: solo facturas de ingreso (tipo I). Las
 * notas de crédito, los complementos de pago y los traslados van aparte.
 */
export function cfdiKindError(data: CfdiData, expected: "I" | "E" = "I"): string | null {
  if (data.type === expected) return null;
  if (expected === "E") return "Este XML no es una nota de crédito (tipo E).";
  if (data.type === "I") return null;
  if (data.type === "E") return "Es una nota de crédito (tipo E), no una factura.";
  if (data.type === "P") return "Es un complemento de pago (tipo P), no una factura.";
  if (data.type === "T") return "Es un CFDI de traslado (tipo T): no lleva cobro.";
  return `Este CFDI es de tipo ${data.type || "desconocido"}: aquí solo van facturas de ingreso.`;
}

/** La contraparte: a quién le facturamos (receptor) o quién nos factura (emisor). */
export function cfdiParty(data: CfdiData, kind: BillingKind) {
  return kind === "receivable" ? data.receiver : data.issuer;
}

/** Los campos de la factura que salen del XML y ya no se capturan a mano. */
export function cfdiDocumentFields(data: CfdiData, kind: BillingKind) {
  const party = cfdiParty(data, kind);
  return {
    partyName: party.name ?? party.rfc,
    partyRfc: party.rfc,
    series: data.series,
    folio: data.folio ?? data.uuid?.slice(-8) ?? null,
    uuid: data.uuid,
    currency: data.currency,
    exchangeRate: data.exchangeRate,
    subtotal: data.subtotal,
    ivaRate: data.ivaRate,
    iva: data.iva,
    ivaWithheld: data.ivaWithheld,
    isrWithheld: data.isrWithheld,
    total: data.total,
    paymentMethod: data.paymentMethod,
  };
}
