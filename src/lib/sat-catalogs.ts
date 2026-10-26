/**
 * Catálogos del SAT que usa JTP para facturar (CFDI 4.0) y para la Carta
 * Porte 3.1. Solo las claves que aplican a una empresa de logística; las
 * claves son las oficiales del SAT.
 *
 * Puro y sin base de datos.
 */

export interface SatOption {
  value: string;
  label: string;
}

/** c_RegimenFiscal */
export const TAX_REGIMES: SatOption[] = [
  { value: "601", label: "601 · General de Ley Personas Morales" },
  { value: "603", label: "603 · Personas Morales con Fines no Lucrativos" },
  { value: "605", label: "605 · Sueldos y Salarios e Ingresos Asimilados" },
  { value: "606", label: "606 · Arrendamiento" },
  { value: "608", label: "608 · Demás ingresos" },
  { value: "610", label: "610 · Residentes en el Extranjero sin Establecimiento Permanente" },
  { value: "612", label: "612 · Personas Físicas con Actividades Empresariales y Profesionales" },
  { value: "616", label: "616 · Sin obligaciones fiscales" },
  { value: "620", label: "620 · Sociedades Cooperativas de Producción" },
  { value: "621", label: "621 · Incorporación Fiscal" },
  { value: "622", label: "622 · Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras" },
  { value: "623", label: "623 · Opcional para Grupos de Sociedades" },
  { value: "624", label: "624 · Coordinados" },
  { value: "625", label: "625 · Actividades Empresariales con ingresos a través de Plataformas Tecnológicas" },
  { value: "626", label: "626 · Régimen Simplificado de Confianza" },
];

/** c_UsoCFDI — los que pide un cliente de transporte. */
export const CFDI_USES: SatOption[] = [
  { value: "G03", label: "G03 · Gastos en general" },
  { value: "G01", label: "G01 · Adquisición de mercancías" },
  { value: "G02", label: "G02 · Devoluciones, descuentos o bonificaciones" },
  { value: "I08", label: "I08 · Otra maquinaria y equipo" },
  { value: "S01", label: "S01 · Sin efectos fiscales" },
  { value: "CP01", label: "CP01 · Pagos" },
];

/** c_ConfigAutotransporte — configuración vehicular de la unidad motriz. */
export const VEHICLE_CONFIGS: SatOption[] = [
  { value: "VL", label: "VL · Vehículo ligero de carga" },
  { value: "C2", label: "C2 · Camión unitario de 2 ejes (6 llantas)" },
  { value: "C3", label: "C3 · Camión unitario de 3 ejes (torton)" },
  { value: "C2R2", label: "C2R2 · Camión-remolque (6 ejes)" },
  { value: "C3R2", label: "C3R2 · Camión-remolque (7 ejes)" },
  { value: "C2R3", label: "C2R3 · Camión-remolque (7 ejes)" },
  { value: "C3R3", label: "C3R3 · Camión-remolque (8 ejes)" },
  { value: "T2S1", label: "T2S1 · Tractocamión articulado (3 ejes)" },
  { value: "T2S2", label: "T2S2 · Tractocamión articulado (4 ejes)" },
  { value: "T2S3", label: "T2S3 · Tractocamión articulado (5 ejes)" },
  { value: "T3S1", label: "T3S1 · Tractocamión articulado (4 ejes)" },
  { value: "T3S2", label: "T3S2 · Tractocamión articulado (5 ejes, caja sencilla)" },
  { value: "T3S3", label: "T3S3 · Tractocamión articulado (6 ejes)" },
  { value: "T3S2R4", label: "T3S2R4 · Tractocamión doblemente articulado (9 ejes, full)" },
  { value: "T3S2R3", label: "T3S2R3 · Tractocamión doblemente articulado (8 ejes)" },
  { value: "T3S2R2", label: "T3S2R2 · Tractocamión doblemente articulado (7 ejes)" },
  { value: "T2S2S2", label: "T2S2S2 · Tractocamión semirremolque-semirremolque (6 ejes)" },
  { value: "T3S2S2", label: "T3S2S2 · Tractocamión semirremolque-semirremolque (7 ejes)" },
  { value: "T3S3S2", label: "T3S3S2 · Tractocamión semirremolque-semirremolque (8 ejes)" },
];

/** c_TipoPermiso — permiso de la SCT. */
export const SCT_PERMITS: SatOption[] = [
  { value: "TPAF01", label: "TPAF01 · Autotransporte federal de carga general" },
  { value: "TPAF02", label: "TPAF02 · Transporte privado de carga" },
  { value: "TPAF03", label: "TPAF03 · Carga especializada de materiales y residuos peligrosos" },
  { value: "TPAF04", label: "TPAF04 · Automóviles sin rodar en vehículo tipo góndola" },
  { value: "TPAF05", label: "TPAF05 · Carga de gran peso y/o volumen de hasta 90 toneladas" },
  { value: "TPAF06", label: "TPAF06 · Carga especializada de gran peso y/o volumen de más de 90 toneladas" },
  { value: "TPAF07", label: "TPAF07 · Transporte privado de materiales y residuos peligrosos" },
  { value: "TPXX00", label: "TPXX00 · Permiso no contemplado en el catálogo" },
];

/** c_SubTipoRem — subtipo de remolque o semirremolque. */
export const TRAILER_SUBTYPES: SatOption[] = [
  { value: "CTR004", label: "CTR004 · Caja cerrada" },
  { value: "CTR007", label: "CTR007 · Caja seca" },
  { value: "CTR006", label: "CTR006 · Caja refrigerada" },
  { value: "CTR003", label: "CTR003 · Caja abierta" },
  { value: "CTR021", label: "CTR021 · Plataforma" },
  { value: "CTR023", label: "CTR023 · Plataforma encortinada" },
  { value: "CTR010", label: "CTR010 · Chasis portacontenedor" },
  { value: "CTR009", label: "CTR009 · Cama baja o cuello ganso" },
  { value: "CTR028", label: "CTR028 · Tanque" },
  { value: "CTR029", label: "CTR029 · Tolva" },
  { value: "CTR031", label: "CTR031 · Volteo" },
  { value: "CTR024", label: "CTR024 · Redilas" },
  { value: "CTR018", label: "CTR018 · Jaula" },
  { value: "CTR014", label: "CTR014 · Góndola madrina" },
  { value: "CTR012", label: "CTR012 · Equipo especial" },
];

export const labelOf = (list: SatOption[], value: string | null | undefined) =>
  value ? (list.find((o) => o.value === value)?.label ?? value) : null;

const has = (list: SatOption[], v: string) => list.some((o) => o.value === v);

/** RFC de persona moral (12) o física (13). */
export const RFC_RE = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;

export function normalizeRfc(v: string) {
  return v.trim().toUpperCase().replace(/[\s-]/g, "");
}

/**
 * Lee y valida los datos fiscales de un cliente. Cada campo es opcional (se
 * capturan poco a poco), pero si viene tiene que ser válido.
 */
export function readClientFiscal(body: Record<string, unknown>):
  | { ok: true; data: { rfc?: string | null; taxRegime?: string | null; fiscalZip?: string | null; cfdiUse?: string | null; creditDays?: number | null } }
  | { ok: false; error: string } {
  const data: { rfc?: string | null; taxRegime?: string | null; fiscalZip?: string | null; cfdiUse?: string | null; creditDays?: number | null } = {};
  const str = (k: string) => (body[k] === undefined ? undefined : typeof body[k] === "string" ? (body[k] as string).trim() : "");

  const rfc = str("rfc");
  if (rfc !== undefined) {
    const r = normalizeRfc(rfc);
    if (r && !RFC_RE.test(r)) return { ok: false, error: "El RFC no tiene un formato válido (12 o 13 caracteres)." };
    data.rfc = r || null;
  }
  const regime = str("taxRegime");
  if (regime !== undefined) {
    if (regime && !has(TAX_REGIMES, regime)) return { ok: false, error: "El régimen fiscal no es válido." };
    data.taxRegime = regime || null;
  }
  const zip = str("fiscalZip");
  if (zip !== undefined) {
    if (zip && !/^\d{5}$/.test(zip)) return { ok: false, error: "El código postal fiscal debe tener 5 dígitos." };
    data.fiscalZip = zip || null;
  }
  const use = str("cfdiUse")?.toUpperCase();
  if (use !== undefined) {
    if (use && !has(CFDI_USES, use)) return { ok: false, error: "El uso del CFDI no es válido." };
    data.cfdiUse = use || null;
  }
  // Días de crédito: vacío = sin definir (las facturas vencen a 30 días por omisión).
  if (body.creditDays !== undefined) {
    const raw = body.creditDays === null ? "" : String(body.creditDays).trim();
    const days = raw === "" ? null : Number(raw);
    if (days !== null && !(Number.isInteger(days) && days >= 0 && days <= 365)) {
      return { ok: false, error: "Los días de crédito deben ser un número entero de 0 a 365." };
    }
    data.creditDays = days;
  }
  return { ok: true, data };
}

/** Si el cliente tiene todo lo que pide el CFDI 4.0 para el receptor. */
export function clientReadyToInvoice(c: {
  name: string;
  legalName?: string | null;
  rfc: string | null;
  taxRegime?: string | null;
  fiscalZip?: string | null;
}) {
  // En el catálogo, "Razón social" se captura en el nombre del cliente.
  return Boolean((c.legalName?.trim() || c.name.trim()) && c.rfc && c.taxRegime && c.fiscalZip);
}

/** Qué le falta a un cliente para poder facturarle. */
export function missingFiscalData(c: { rfc: string | null; taxRegime?: string | null; fiscalZip?: string | null }): string[] {
  const missing: string[] = [];
  if (!c.rfc) missing.push("RFC");
  if (!c.taxRegime) missing.push("régimen fiscal");
  if (!c.fiscalZip) missing.push("código postal fiscal");
  return missing;
}
