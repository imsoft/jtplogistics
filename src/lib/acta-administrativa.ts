/**
 * Acta administrativa: los datos que RH captura y cómo se convierten en el
 * texto del documento. Puro y sin navegador, para poder probarlo; el PDF está
 * en components/dashboard/hr/acta-pdf.tsx.
 *
 * Sale del machote que entregó RH: lo que en el machote iba en amarillo es lo
 * que aquí se captura; el resto es texto fijo.
 */

import { pdfSentence } from "@/lib/pdf-text-case";

export const COMPANY_LEGAL_NAME = "JTP FREIGHT, S. DE R. L. DE C. V.";
export const COMPANY_ADDRESS =
  "AVENIDA REAL ACUEDUCTO 335, PISO 18, COLONIA PUERTA DE HIERRO, EN ZAPOPAN, JALISCO, CÓDIGO POSTAL 45116";
export const COMPANY_CITY = "Zapopan, Jalisco";

export const ACTA_AREAS = ["operativa", "financiera", "administrativa"] as const;
export type ActaArea = (typeof ACTA_AREAS)[number];

export interface ActaData {
  /** "YYYY-MM-DD" y "HH:MM" en que se levanta el acta. */
  date: string;
  startTime: string;
  endTime: string;
  responsibleName: string;
  responsibleTitle: string;
  employeeName: string;
  employeePosition: string;
  /** Antecedentes: lo que hace el colaborador en su puesto. */
  duties: string;
  /** Hecho I. */
  incidentDate: string;
  incidentDescription: string;
  /** Hecho II: la reunión en que se pidió explicación. */
  meetingDate: string;
  employeeResponse: string;
  /** En qué incumplió sus funciones. */
  breach: string;
  /** Lo que el colaborador manifiesta. Vacío: se deja el espacio para escribir a mano. */
  statement: string;
  area: ActaArea;
  witness1: string;
  witness2: string;
}

export const DEFAULT_DUTIES =
  "de seguimiento continuo de clientes y proveedores relacionados a las operaciones de logística de la empresa, y el cumplimiento de las condiciones y protocolos aplicables a los servicios";

export function emptyActa(today: string, now: string, responsibleName = ""): ActaData {
  return {
    date: today,
    startTime: now,
    endTime: "",
    responsibleName,
    responsibleTitle: "Gerente de recursos humanos",
    employeeName: "",
    employeePosition: "",
    duties: DEFAULT_DUTIES,
    incidentDate: today,
    incidentDescription: "",
    meetingDate: today,
    employeeResponse: "",
    breach: "",
    statement: "",
    area: "operativa",
    witness1: "",
    witness2: "",
  };
}

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const UNITS = [
  "", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve",
  "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete",
  "dieciocho", "diecinueve", "veinte", "veintiuno", "veintidós", "veintitrés",
  "veinticuatro", "veinticinco", "veintiséis", "veintisiete", "veintiocho", "veintinueve",
];
const TENS = ["", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];

/** 0–99 en letra. */
function under100(n: number): string {
  if (n < 30) return UNITS[n];
  const t = Math.floor(n / 10);
  const u = n % 10;
  return u === 0 ? TENS[t] : `${TENS[t]} y ${UNITS[u]}`;
}

/** El año en letra, como lo pide un acta: 2026 → "dos mil veintiséis". */
export function yearInWords(year: number): string {
  if (year < 2000 || year > 2099) throw new Error(`Año fuera de rango: ${year}`);
  const rest = year - 2000;
  return rest === 0 ? "dos mil" : `dos mil ${under100(rest)}`;
}

/** "2026-10-09" → { day: 9, month: "octubre", year: 2026 }. Sin Date: no hay zona que lo recorra. */
export function splitDate(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return { day: d, month: MONTHS[m - 1], year: y };
}

/** "el día 9 de octubre de 2026". */
export function longDate(key: string): string {
  const { day, month, year } = splitDate(key);
  return `${day} de ${month} de ${year}`;
}

/** "10:30" → "10:30". Vacío → la línea para escribirlo a mano. */
export function timeOrBlank(value: string): string {
  return value.trim() || "________";
}

export type ActaErrors = Partial<Record<keyof ActaData, string>>;

/** Lo mínimo para que el acta tenga sentido. Lo demás puede ir en blanco. */
export function validateActa(data: ActaData): ActaErrors {
  const errors: ActaErrors = {};
  const need: [keyof ActaData, string][] = [
    ["date", "Falta la fecha del acta."],
    ["startTime", "Falta la hora de inicio."],
    ["responsibleName", "Falta quién levanta el acta."],
    ["employeeName", "Falta el colaborador."],
    ["employeePosition", "Falta el puesto del colaborador."],
    ["incidentDate", "Falta la fecha de los hechos."],
    ["incidentDescription", "Describe los hechos."],
    ["breach", "Escribe en qué incumplió."],
  ];
  for (const [key, msg] of need) {
    if (!String(data[key] ?? "").trim()) errors[key] = msg;
  }
  for (const key of ["date", "incidentDate", "meetingDate"] as const) {
    const v = data[key];
    if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) errors[key] = "Fecha inválida.";
    else if (v) {
      const { year } = splitDate(v);
      if (year < 2000 || year > 2099) errors[key] = "Fecha inválida.";
    }
  }
  // "HH:MM" se compara bien como texto.
  if (data.endTime && data.startTime && data.endTime < data.startTime) {
    errors.endTime = "La hora de cierre no puede ser antes que la de inicio.";
  }
  if (data.incidentDate && data.date && data.incidentDate > data.date) {
    errors.incidentDate = "Los hechos no pueden ser posteriores al acta.";
  }
  return errors;
}

export function actaFilename(data: ActaData): string {
  const who = data.employeeName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `acta-administrativa-${who || "colaborador"}-${data.date}.pdf`;
}

/**
 * Texto libre que continúa una oración del machote ("el colaborador omitió …"):
 * formato oración, pero sin mayúscula inicial, salvo que empiece con sigla
 * ("IMSS", "SAT"). La interfaz enseña todo en mayúsculas y nadie ve cómo quedó
 * escrito, así que esto lo normaliza.
 */
export function continuation(value: string): string {
  const text = pdfSentence(value).replace(/[.\s]+$/, "");
  if (!text) return text;
  const firstWord = text.split(/\s/)[0];
  const isAcronym = firstWord.length > 1 && firstWord === firstWord.toLocaleUpperCase("es-MX");
  return isAcronym ? text : text.charAt(0).toLocaleLowerCase("es-MX") + text.slice(1);
}
