/**
 * Expediente de Carta Porte del transportista: unidades (motriz y remolques) y
 * operadores, con lo que pide la Carta Porte 3.1 en Autotransporte y
 * FiguraTransporte.
 *
 * Puro y sin base de datos, para poder probarlo.
 */

import { RFC_RE, SCT_PERMITS, TRAILER_SUBTYPES, VEHICLE_CONFIGS, normalizeRfc } from "@/lib/sat-catalogs";

export type VehicleKind = "motriz" | "remolque";

export interface VehicleData {
  kind: VehicleKind;
  label: string | null;
  plates: string;
  year: number | null;
  vehicleConfig: string | null;
  sctPermitType: string | null;
  sctPermitNumber: string | null;
  grossWeightTons: number | null;
  insurer: string | null;
  policyNumber: string | null;
  trailerSubtype: string | null;
  active: boolean;
}

export interface OperatorData {
  name: string;
  rfc: string | null;
  licenseNumber: string | null;
  phone: string | null;
  active: boolean;
}

const has = (list: { value: string }[], v: string) => list.some((o) => o.value === v);
/** "false" (texto) también es no: Boolean("false") daba sí. */
const readActive = (v: unknown) => !(v === false || v === "false" || v === 0 || v === "0");
const text = (v: unknown) => (typeof v === "string" ? v.trim() || null : null);

/** Placas sin espacios ni guiones y en mayúsculas, como las pide el SAT. */
export function normalizePlates(v: string) {
  return v.toUpperCase().replace(/[\s-]/g, "");
}

export function readVehicleBody(body: Record<string, unknown>, currentYear: number):
  | { ok: true; data: VehicleData }
  | { ok: false; error: string } {
  const kind: VehicleKind = String(body.kind ?? "").toLowerCase() === "remolque" ? "remolque" : "motriz";
  const plates = normalizePlates(String(body.plates ?? ""));
  if (!/^[A-Z0-9]{5,10}$/.test(plates)) return { ok: false, error: "Las placas deben tener de 5 a 10 letras o números." };

  let year: number | null = null;
  if (body.year !== undefined && body.year !== null && body.year !== "") {
    year = Number(body.year);
    if (!Number.isInteger(year) || year < 1970 || year > currentYear + 1) return { ok: false, error: "El año del modelo no es válido." };
  }

  const upper = (k: string) => text(body[k])?.toUpperCase() ?? null;
  const data: VehicleData = {
    kind,
    label: text(body.label),
    plates,
    year,
    vehicleConfig: null,
    sctPermitType: null,
    sctPermitNumber: null,
    grossWeightTons: null,
    insurer: null,
    policyNumber: null,
    trailerSubtype: null,
    active: readActive(body.active),
  };

  if (kind === "motriz") {
    const config = upper("vehicleConfig");
    if (config && !has(VEHICLE_CONFIGS, config)) return { ok: false, error: "La configuración vehicular no es válida." };
    const permit = upper("sctPermitType");
    if (permit && !has(SCT_PERMITS, permit)) return { ok: false, error: "El tipo de permiso SCT no es válido." };
    let weight: number | null = null;
    if (body.grossWeightTons !== undefined && body.grossWeightTons !== null && body.grossWeightTons !== "") {
      weight = Number(body.grossWeightTons);
      if (!Number.isFinite(weight) || weight <= 0 || weight > 120) return { ok: false, error: "El peso bruto vehicular debe estar en toneladas (hasta 120)." };
    }
    Object.assign(data, {
      vehicleConfig: config,
      sctPermitType: permit,
      sctPermitNumber: upper("sctPermitNumber"),
      grossWeightTons: weight,
      insurer: text(body.insurer),
      policyNumber: upper("policyNumber"),
    });
  } else {
    const subtype = upper("trailerSubtype");
    if (subtype && !has(TRAILER_SUBTYPES, subtype)) return { ok: false, error: "El subtipo de remolque no es válido." };
    data.trailerSubtype = subtype;
  }
  return { ok: true, data };
}

export function readOperatorBody(body: Record<string, unknown>):
  | { ok: true; data: OperatorData }
  | { ok: false; error: string } {
  const name = text(body.name);
  if (!name || name.length < 3) return { ok: false, error: "Escribe el nombre del operador." };
  const rfcRaw = text(body.rfc);
  const rfc = rfcRaw ? normalizeRfc(rfcRaw) : null;
  if (rfc && !RFC_RE.test(rfc)) return { ok: false, error: "El RFC del operador no tiene un formato válido." };
  return {
    ok: true,
    data: {
      name,
      rfc,
      licenseNumber: text(body.licenseNumber)?.toUpperCase() ?? null,
      phone: text(body.phone),
      active: readActive(body.active),
    },
  };
}

/** Qué le falta a una unidad para poder ir en una Carta Porte. */
export function vehicleMissing(v: Pick<VehicleData, "kind" | "plates" | "year" | "vehicleConfig" | "sctPermitType" | "sctPermitNumber" | "grossWeightTons" | "insurer" | "policyNumber" | "trailerSubtype">): string[] {
  const missing: string[] = [];
  if (!v.plates) missing.push("placas");
  if (v.kind === "motriz") {
    if (!v.year) missing.push("año");
    if (!v.vehicleConfig) missing.push("configuración vehicular");
    if (!v.sctPermitType || !v.sctPermitNumber) missing.push("permiso SCT");
    if (!v.grossWeightTons) missing.push("peso bruto");
    if (!v.insurer || !v.policyNumber) missing.push("seguro de responsabilidad civil");
  } else if (!v.trailerSubtype) {
    missing.push("subtipo de remolque");
  }
  return missing;
}

/** Qué le falta a un operador. */
export function operatorMissing(o: Pick<OperatorData, "rfc" | "licenseNumber">): string[] {
  const missing: string[] = [];
  if (!o.rfc) missing.push("RFC");
  if (!o.licenseNumber) missing.push("licencia");
  return missing;
}

/**
 * Si el transportista ya puede salir en una Carta Porte: al menos una unidad
 * motriz y un operador activos con todo completo.
 */
export function fleetReadiness(vehicles: VehicleData[], operators: OperatorData[]) {
  const readyVehicle = vehicles.some((v) => v.active && v.kind === "motriz" && vehicleMissing(v).length === 0);
  const readyOperator = operators.some((o) => o.active && operatorMissing(o).length === 0);
  const missing: string[] = [];
  if (!readyVehicle) missing.push("una unidad motriz con todos sus datos");
  if (!readyOperator) missing.push("un operador con RFC y licencia");
  return { ready: missing.length === 0, missing };
}
