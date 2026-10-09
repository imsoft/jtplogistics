/**
 * Arma la tabla del registro del checador para descargarla en Excel, Word y
 * PDF. Puro y sin navegador: los tres formatos salen de esta misma tabla, así
 * que no pueden decir cosas distintas, y se puede probar.
 */

import { COMPANY_TZ } from "@/lib/time-clock";
import { LEAVE_LABELS, type LeaveKind } from "@/lib/time-clock-leaves";

export type ExportMark = "clock_in" | "lunch_start" | "lunch_end" | "clock_out";

export interface ExportMarkData {
  at: string;
  distanceM: number | null;
  geoStatus: string | null;
  outsideGeofence: boolean | null;
  foreignNetwork: boolean | null;
  sharedDevice: boolean | null;
}

export interface ExportRow {
  leave: string | null;
  workDate: string;
  userName: string;
  marks: Partial<Record<ExportMark, ExportMarkData>>;
  reasons: string[];
  flags: { kind: string; minutesLate: number | null }[];
  corrections: { kind: string | null; reason: string | null; by: string | null }[];
}

export const EXPORT_MARKS: { mark: ExportMark; label: string }[] = [
  { mark: "clock_in", label: "Entrada" },
  { mark: "lunch_start", label: "Comida" },
  { mark: "lunch_end", label: "Regreso" },
  { mark: "clock_out", label: "Salida" },
];

const FLAG_LABELS: Record<string, string> = {
  retardo: "Retardo",
  falta: "Falta",
  comida_larga: "Comida larga",
  sin_comida: "Sin marcar comida",
};

const CORRECTION_LABELS: Record<string, string> = {
  adjust: "Hora corregida",
  void: "Marca anulada",
  add: "Marca agregada",
};

/**
 * La plataforma se ve toda en mayúsculas, pero por estilo: los nombres están
 * guardados en minúsculas. El archivo debe verse como la pantalla de quien lo
 * descarga, así que aquí sí se convierte el texto.
 */
const upper = (value: string) => value.toLocaleUpperCase("es-MX");

export const TIME_CLOCK_EXPORT_HEADERS = [
  "Colaborador",
  "Jornada",
  "Día",
  ...EXPORT_MARKS.map((m) => m.label),
  "Anotaciones",
  "Señales",
  "Motivos",
  "Correcciones",
].map(upper);

/** "2026-10-09" → "09/10/2026". Sin Date: una fecha sola no tiene zona. */
export function exportDate(key: string): string {
  const [y, m, d] = key.split("-");
  return y && m && d ? `${d}/${m}/${y}` : key;
}

/** La hora que quedó registrada, al segundo y en la zona de la empresa. */
function exportTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: COMPANY_TZ,
  });
}

/** Las mismas señales que la pantalla pinta bajo cada hora, en texto. */
function markSignals(label: string, m: ExportMarkData): string[] {
  const out: string[] = [];
  if (m.geoStatus !== "granted") out.push("sin ubicación");
  if (m.outsideGeofence && m.distanceM !== null) out.push(`a ${m.distanceM} m de la oficina`);
  if (m.foreignNetwork) out.push("otra conexión");
  if (m.sharedDevice) out.push("equipo compartido");
  return out.length ? [`${label}: ${out.join(", ")}`] : [];
}

export function timeClockExportRows(
  rows: ExportRow[],
  holidays: Map<string, string> = new Map()
): string[][] {
  return rows.map((row) => {
    const day = [
      row.leave ? LEAVE_LABELS[row.leave as LeaveKind] ?? row.leave : null,
      holidays.has(row.workDate) ? `Festivo: ${holidays.get(row.workDate)}` : null,
    ].filter(Boolean);

    const flags = row.flags.map((f) => {
      const label = FLAG_LABELS[f.kind] ?? f.kind;
      return f.minutesLate !== null && f.minutesLate > 0 ? `${label} ${f.minutesLate} min` : label;
    });

    const signals = EXPORT_MARKS.flatMap(({ mark, label }) => {
      const m = row.marks[mark];
      return m ? markSignals(label, m) : [];
    });

    const corrections = row.corrections.map((c) => {
      const what = c.kind ? CORRECTION_LABELS[c.kind] ?? c.kind : "Corregido";
      return `${what}${c.by ? ` por ${c.by}` : ""}${c.reason ? `: ${c.reason}` : ""}`;
    });

    const cells = [
      row.userName,
      exportDate(row.workDate),
      day.join("; "),
      ...EXPORT_MARKS.map(({ mark }) => (row.marks[mark] ? exportTime(row.marks[mark]!.at) : "")),
      flags.join("; "),
      signals.join("; "),
      row.reasons.join("; "),
      corrections.join("; "),
    ];
    return cells.map(upper);
  });
}

/** "Del 01/10/2026 al 09/10/2026", o un solo día. */
export function exportPeriodLabel(from: string, to: string): string {
  return from === to ? exportDate(from) : `Del ${exportDate(from)} al ${exportDate(to)}`;
}

export function timeClockExportFilename(from: string, to: string, ext: string): string {
  const range = from === to ? from : `${from}_a_${to}`;
  return `registro-checador-${range}.${ext}`;
}
