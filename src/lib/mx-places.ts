/**
 * Municipios de cada estado (catálogo del INEGI) por la clave del SAT del
 * estado: para filtrar municipio y localidad en la Carta Porte.
 *
 * Puro, para poder probarlo.
 */
import { MEXICO_STATES_CITIES } from "@/lib/data/mexico-cities";
import { MX_STATES } from "@/lib/sat-catalogs";

const BY_NAME = new Map(MEXICO_STATES_CITIES.map((g) => [g.value, g.items]));

/** Municipios del estado ("JAL" → ["Acatic", …]); clave desconocida → []. */
export function municipalitiesFor(stateKey: string | null | undefined): string[] {
  const st = MX_STATES.find((s) => s.value === (stateKey ?? "").toUpperCase());
  return st ? (BY_NAME.get(st.name) ?? []) : [];
}

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Si el municipio pertenece al estado (sin importar acentos ni mayúsculas). */
export function isMunicipalityOf(stateKey: string, municipality: string): boolean {
  const m = fold(municipality);
  return municipalitiesFor(stateKey).some((x) => fold(x) === m);
}
