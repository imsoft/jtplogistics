/**
 * Datos de la Carta Porte que se capturan en el embarque: ubicaciones (origen
 * y destino), mercancías (varias) y autotransporte. Se guardan como JSON en el
 * embarque y salen en el PDF de la carta porte.
 *
 * Todo va en texto (también los números) para que el formulario guarde tal
 * cual lo que se escribió; los totales se calculan aquí.
 *
 * Puro, para poder probarlo.
 */

// `type` y no `interface`: así Prisma los acepta como JSON.
export type CartaPorteLocation = {
  rfc: string;
  name: string;
  /** Número de registro fiscal (solo residentes en el extranjero). */
  numRegIdTrib: string;
  street: string;
  extNumber: string;
  intNumber: string;
  postalCode: string;
  colony: string;
  locality: string;
  municipality: string;
  state: string;
  country: string;
  /** Fecha y hora de salida (origen) o de llegada (destino): "YYYY-MM-DDTHH:mm". */
  dateTime: string;
  /** Solo destino: kilómetros recorridos desde el origen. */
  distanceKm: string;
};

export type CartaPorteGood = {
  /** Clave de producto (c_ClaveProdServCP), p. ej. 24122002. */
  satKey: string;
  description: string;
  quantity: string;
  /** Clave de unidad (c_ClaveUnidad), p. ej. H87. */
  unitKey: string;
  weightKg: string;
  tareKg: string;
  netKg: string;
};

export type CartaPorteTransport = {
  permitType: string;
  permitNumber: string;
  vehicleConfig: string;
  plates: string;
  modelYear: string;
  /** Peso bruto vehicular en toneladas. */
  grossVehicleWeight: string;
  civilInsurer: string;
  civilPolicy: string;
  cargoInsurer: string;
  cargoPolicy: string;
  cargoPremium: string;
  trailerSubtype: string;
  trailerPlates: string;
};

export type CartaPorte = {
  origin: CartaPorteLocation;
  destination: CartaPorteLocation;
  goods: CartaPorteGood[];
  inverseLogistics: boolean;
  transport: CartaPorteTransport;
};

const LOCATION_KEYS = [
  "rfc", "name", "numRegIdTrib", "street", "extNumber", "intNumber", "postalCode", "colony",
  "locality", "municipality", "state", "country", "dateTime", "distanceKm",
] as const satisfies readonly (keyof CartaPorteLocation)[];
const GOOD_KEYS = ["satKey", "description", "quantity", "unitKey", "weightKg", "tareKg", "netKg"] as const satisfies readonly (keyof CartaPorteGood)[];
const TRANSPORT_KEYS = [
  "permitType", "permitNumber", "vehicleConfig", "plates", "modelYear", "grossVehicleWeight", "civilInsurer",
  "civilPolicy", "cargoInsurer", "cargoPolicy", "cargoPremium", "trailerSubtype", "trailerPlates",
] as const satisfies readonly (keyof CartaPorteTransport)[];

/** Campos numéricos: se guardan como texto, pero solo con dígitos y punto. */
const NUMERIC = new Set<string>(["quantity", "weightKg", "tareKg", "netKg", "grossVehicleWeight", "cargoPremium", "distanceKm", "modelYear"]);
/** Claves que el SAT pide en mayúsculas y sin espacios. */
const CODES = new Set<string>(["rfc", "numRegIdTrib", "postalCode", "satKey", "unitKey", "plates", "trailerPlates", "permitType", "vehicleConfig", "trailerSubtype"]);

const empty = <K extends string>(keys: readonly K[]) => Object.fromEntries(keys.map((k) => [k, ""])) as Record<K, string>;

export const emptyLocation = (): CartaPorteLocation => ({ ...empty(LOCATION_KEYS), country: "MEX" });
export const emptyGood = (): CartaPorteGood => empty(GOOD_KEYS);
export const emptyTransport = (): CartaPorteTransport => empty(TRANSPORT_KEYS);
export const emptyCartaPorte = (): CartaPorte => ({
  origin: emptyLocation(),
  destination: emptyLocation(),
  goods: [emptyGood()],
  inverseLogistics: false,
  transport: emptyTransport(),
});

/** "1,250.5 kg" → "1250.5"; lo que no es número → "". */
export function cleanNumber(v: string): string {
  const s = v.replace(/[,\s$]/g, "").replace(/[^\d.]/g, "");
  const [int, ...rest] = s.split(".");
  const out = rest.length ? `${int}.${rest.join("")}` : int;
  return out === "." ? "" : out;
}

function cleanField(key: string, value: unknown): string {
  const s = typeof value === "string" ? value.trim() : typeof value === "number" && Number.isFinite(value) ? String(value) : "";
  if (!s) return "";
  if (NUMERIC.has(key)) return cleanNumber(s);
  if (CODES.has(key)) return s.toUpperCase().replace(/\s+/g, "");
  return s.slice(0, 300);
}

function readGroup<K extends string>(keys: readonly K[], value: unknown, base: Record<K, string>): Record<K, string> {
  const o = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const out = { ...base };
  for (const k of keys) if (k in o) out[k] = cleanField(k, o[k]);
  return out;
}

const blankGood = (g: CartaPorteGood) => GOOD_KEYS.every((k) => !g[k]);

/**
 * Lo que venga (JSON de la BD o del formulario) → carta porte limpia. Las
 * mercancías vacías se descartan (pero siempre queda al menos un renglón).
 */
export function readCartaPorte(value: unknown): CartaPorte {
  const o = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const goods = (Array.isArray(o.goods) ? o.goods : [])
    .slice(0, 100)
    .map((g) => readGroup(GOOD_KEYS, g, emptyGood()))
    .filter((g) => !blankGood(g));
  return {
    origin: readGroup(LOCATION_KEYS, o.origin, emptyLocation()),
    destination: readGroup(LOCATION_KEYS, o.destination, emptyLocation()),
    goods: goods.length ? goods : [emptyGood()],
    inverseLogistics: o.inverseLogistics === true,
    transport: readGroup(TRANSPORT_KEYS, o.transport, emptyTransport()),
  };
}

/** Si no se capturó nada (el país por omisión no cuenta). */
export function isCartaPorteEmpty(cp: CartaPorte): boolean {
  const loc = (l: CartaPorteLocation) => LOCATION_KEYS.every((k) => k === "country" || !l[k]);
  return (
    loc(cp.origin) &&
    loc(cp.destination) &&
    cp.goods.every(blankGood) &&
    !cp.inverseLogistics &&
    TRANSPORT_KEYS.every((k) => !cp.transport[k])
  );
}

/** Para guardar: limpia y, si no hay nada capturado, `null`. */
export function cartaPorteForDb(value: unknown): CartaPorte | null {
  if (value === null || value === undefined) return null;
  const cp = readCartaPorte(value);
  if (isCartaPorteEmpty(cp)) return null;
  return { ...cp, goods: cp.goods.filter((g) => !blankGood(g)) };
}

const num = (s: string) => {
  const n = Number(s);
  return s && Number.isFinite(n) ? n : 0;
};

/** Totales del nodo Mercancías: peso bruto (kg) y número de mercancías. */
export function cartaPorteTotals(cp: CartaPorte): { grossWeightKg: number; count: number } {
  const goods = cp.goods.filter((g) => !blankGood(g));
  return {
    grossWeightKg: Math.round(goods.reduce((t, g) => t + num(g.weightKg), 0) * 1000) / 1000,
    count: goods.length,
  };
}

/** Lo que el SAT pide y todavía no se capturó, en palabras. */
export function cartaPorteMissing(cp: CartaPorte): string[] {
  const out: string[] = [];
  for (const [label, l] of [["origen", cp.origin], ["destino", cp.destination]] as const) {
    const miss = [
      !l.rfc && "RFC",
      !l.name && "nombre",
      !l.postalCode && "CP",
      !l.state && "estado",
      !l.dateTime && "fecha y hora",
    ].filter(Boolean);
    if (miss.length) out.push(`${label}: ${miss.join(", ")}`);
  }
  const goods = cp.goods.filter((g) => !blankGood(g));
  if (!goods.length) out.push("al menos una mercancía");
  goods.forEach((g, i) => {
    const miss = [!g.satKey && "clave", !g.description && "descripción", !g.quantity && "cantidad", !g.unitKey && "clave de unidad", !g.weightKg && "peso"].filter(Boolean);
    if (miss.length) out.push(`mercancía ${i + 1}: ${miss.join(", ")}`);
  });
  const t = cp.transport;
  const tm = [
    !t.permitType && "tipo de permiso",
    !t.permitNumber && "folio del permiso",
    !t.vehicleConfig && "configuración vehicular",
    !t.plates && "placa",
    !t.modelYear && "modelo",
    !t.civilInsurer && "aseguradora de responsabilidad civil",
    !t.civilPolicy && "póliza de responsabilidad civil",
  ].filter(Boolean);
  if (tm.length) out.push(`autotransporte: ${tm.join(", ")}`);
  return out;
}

/** IDUbicacion del SAT: OR000001 para el origen, DE000001 para el destino. */
export const locationId = (kind: "origin" | "destination") => (kind === "origin" ? "OR000001" : "DE000001");

/** Resumen corto para la bitácora. */
export function cartaPorteSummary(cp: CartaPorte | null): string | null {
  if (!cp || isCartaPorteEmpty(cp)) return null;
  const { grossWeightKg, count } = cartaPorteTotals(cp);
  const parts = [
    cp.origin.rfc && `origen ${cp.origin.rfc}`,
    cp.destination.rfc && `destino ${cp.destination.rfc}`,
    `${count} mercancía${count === 1 ? "" : "s"}`,
    grossWeightKg ? `${grossWeightKg} kg` : null,
    cp.transport.plates && `placa ${cp.transport.plates}`,
  ].filter(Boolean);
  return parts.join(" · ");
}
