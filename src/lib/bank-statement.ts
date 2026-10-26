/**
 * Estado de cuenta del banco: leerlo (CSV o Excel, en el formato de cada
 * banco) y empatarlo contra los movimientos de la plataforma para conciliar
 * sin marcar uno por uno.
 *
 * Puro, para poder probarlo. Las fechas salen como "YYYY-MM-DD".
 */

import { normalizeSearch } from "@/lib/search";

export interface StatementLine {
  date: string;
  /** Positivo entra a la cuenta, negativo sale. */
  amount: number;
  description: string;
  reference: string | null;
}

export type Cell = string | number | Date | null | undefined;

const HEADERS = {
  date: ["fecha", "fecha operacion", "fecha de operacion", "fecha movimiento", "fecha valor", "dia", "date"],
  description: ["concepto", "descripcion", "detalle", "movimiento", "concepto / referencia", "description"],
  reference: ["referencia", "ref", "folio", "rastreo", "clave de rastreo", "numero de referencia", "reference"],
  debit: ["cargo", "cargos", "retiro", "retiros", "debe", "salida", "salidas", "debito"],
  credit: ["abono", "abonos", "deposito", "depositos", "haber", "entrada", "entradas", "credito"],
  amount: ["importe", "monto", "cantidad", "amount"],
} as const;

type Field = keyof typeof HEADERS;

const MONTHS: Record<string, number> = { ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12, jan: 1, apr: 4, aug: 8, dec: 12 };

const pad = (n: number) => String(n).padStart(2, "0");
/** Solo fechas que existen (31/02 no). */
const key = (y: number, m: number, d: number) => {
  if (y <= 1990 || y >= 2100) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? `${y}-${pad(m)}-${pad(d)}` : null;
};

/** Fechas como las exportan los bancos en México: 15/10/2026, 15-oct-2026, 2026-10-15, Excel. */
export function parseBankDate(v: Cell): string | null {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.toISOString().slice(0, 10);
  if (typeof v === "number") {
    // Número de serie de Excel (días desde 1899-12-30).
    if (v < 20000 || v > 80000) return null;
    return new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86_400_000).toISOString().slice(0, 10);
  }
  const s = normalizeSearch(String(v ?? "")).replace(/\s+/g, " ");
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return key(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (m) return key(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[2], +m[1]);
  m = s.match(/^(\d{1,2})[/ .-]([a-z]{3})[a-z]*[/ .-](\d{2,4})/);
  if (m && MONTHS[m[2]]) return key(m[3].length === 2 ? 2000 + +m[3] : +m[3], MONTHS[m[2]], +m[1]);
  return null;
}

/** "$1,234.56", "(1,234.56)", "-1234.56", "1 234,56"… a número; null si está vacío. */
export function parseBankAmount(v: Cell): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  let s = String(v ?? "").trim();
  if (!s || s === "-") return null;
  // El signo puede venir antes o después del símbolo o la moneda: "$-1,234.56", "MXN -500".
  const bare = s.replace(/[$\s]/g, "").replace(/mxn|usd/gi, "");
  const negative = /^\(.*\)$/.test(bare) || bare.startsWith("-") || /-$/.test(bare);
  s = bare.replace(/[()-]/g, "");
  // Coma decimal (1.234,56) cuando la coma va al final con dos dígitos.
  if (/,\d{2}$/.test(s) && !/\.\d{2}$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

/** Busca el renglón de encabezados y a qué columna corresponde cada dato. */
function findColumns(rows: Cell[][]) {
  for (let r = 0; r < Math.min(rows.length, 30); r++) {
    const cells = rows[r].map((c) => normalizeSearch(String(c ?? "")).replace(/[^a-z0-9 /]/g, "").trim());
    const cols: Partial<Record<Field, number>> = {};
    for (const field of Object.keys(HEADERS) as Field[]) {
      const names = HEADERS[field] as readonly string[];
      const exact = cells.findIndex((c) => names.includes(c));
      const loose = exact >= 0 ? exact : cells.findIndex((c) => c && names.some((n) => c.startsWith(n)));
      if (loose >= 0 && !Object.values(cols).includes(loose)) cols[field] = loose;
    }
    if (cols.date !== undefined && (cols.amount !== undefined || cols.debit !== undefined || cols.credit !== undefined)) {
      return { headerRow: r, cols };
    }
  }
  return null;
}

/**
 * Lee las filas del archivo. Acepta una columna de importe con signo, o dos
 * columnas de cargos y abonos. Se saltan saldos iniciales, totales y renglones
 * sin fecha o sin importe.
 */
export function parseStatementRows(rows: Cell[][]):
  | { ok: true; lines: StatementLine[]; columns: string[] }
  | { ok: false; error: string } {
  const found = findColumns(rows);
  if (!found) {
    return { ok: false, error: "No encontré las columnas de fecha e importe (o cargos y abonos). Revisa que el archivo traiga sus encabezados." };
  }
  const { headerRow, cols } = found;
  const header = rows[headerRow];
  const lines: StatementLine[] = [];
  for (const row of rows.slice(headerRow + 1)) {
    const date = parseBankDate(row[cols.date!]);
    if (!date) continue;
    let amount: number | null = null;
    if (cols.debit !== undefined || cols.credit !== undefined) {
      const out = cols.debit !== undefined ? parseBankAmount(row[cols.debit]) : null;
      const inc = cols.credit !== undefined ? parseBankAmount(row[cols.credit]) : null;
      if (inc) amount = Math.abs(inc);
      else if (out) amount = -Math.abs(out);
    } else {
      amount = parseBankAmount(row[cols.amount!]);
    }
    if (!amount) continue;
    const description = cols.description !== undefined ? String(row[cols.description] ?? "").trim() : "";
    const reference = cols.reference !== undefined ? String(row[cols.reference] ?? "").trim() || null : null;
    lines.push({ date, amount: Math.round(amount * 100) / 100, description: description || "Movimiento del banco", reference });
  }
  if (lines.length === 0) return { ok: false, error: "El archivo no trae movimientos con fecha e importe." };
  const columns = (Object.keys(cols) as Field[]).map((f) => String(header[cols[f]!] ?? f));
  return { ok: true, lines, columns };
}

/** Lee un CSV (coma o punto y coma, con comillas). */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, "");
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? "";
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : firstLine.includes("\t") ? "\t" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"' && clean[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && clean[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim()));
}

/** Renglones del estado de cuenta tal como los leyó el navegador; se validan otra vez. */
export function readStatementLines(v: unknown): StatementLine[] | null {
  if (!Array.isArray(v) || v.length === 0 || v.length > 3000) return null;
  const out: StatementLine[] = [];
  for (const raw of v) {
    const l = raw as Record<string, unknown>;
    const date = typeof l.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(l.date) ? l.date : null;
    const amount = typeof l.amount === "number" && Number.isFinite(l.amount) && l.amount !== 0 ? Math.round(l.amount * 100) / 100 : null;
    if (!date || amount === null) return null;
    out.push({
      date,
      amount,
      description: (typeof l.description === "string" ? l.description.trim() : "").slice(0, 200) || "Movimiento del banco",
      reference: typeof l.reference === "string" && l.reference.trim() ? l.reference.trim().slice(0, 100) : null,
    });
  }
  return out;
}

// ── Empate contra la plataforma ──────────────────────────────────────────────

export interface PlatformMovement {
  id: string;
  date: string;
  amount: number;
  concept: string;
  reference: string | null;
  reconciled: boolean;
}

export interface StatementMatch {
  line: number;
  movementId: string;
  /** Ya estaba conciliado: no hay que hacer nada. */
  alreadyReconciled: boolean;
  /** Días de diferencia entre el banco y la plataforma. */
  dayGap: number;
}

const cents = (n: number) => Math.round(n * 100);
const days = (a: string, b: string) => Math.round(Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000);
const refMatches = (line: StatementLine, m: PlatformMovement) => {
  const r = normalizeSearch(m.reference ?? "");
  return r.length >= 3 && normalizeSearch(`${line.reference ?? ""} ${line.description}`).includes(r);
};

/**
 * Empata cada renglón del banco con un movimiento de la plataforma del mismo
 * importe y con fecha cercana (por omisión, hasta 3 días: los SPEI y cheques
 * a veces se reflejan después). Si hay varios candidatos, gana el que tiene
 * la misma referencia y luego el de fecha más cercana. Cada movimiento se usa
 * una sola vez.
 */
export function matchStatement(lines: StatementLine[], movements: PlatformMovement[], toleranceDays = 3) {
  const used = new Set<string>();
  const matches: StatementMatch[] = [];
  const order = lines.map((l, i) => i).sort((a, b) => lines[a].date.localeCompare(lines[b].date));
  for (const i of order) {
    const line = lines[i];
    const candidates = movements
      .filter((m) => !used.has(m.id) && cents(m.amount) === cents(line.amount) && days(m.date, line.date) <= toleranceDays)
      .sort((a, b) => Number(refMatches(line, b)) - Number(refMatches(line, a)) || days(a.date, line.date) - days(b.date, line.date) || Number(b.reconciled) - Number(a.reconciled));
    const best = candidates[0];
    if (!best) continue;
    used.add(best.id);
    matches.push({ line: i, movementId: best.id, alreadyReconciled: best.reconciled, dayGap: days(best.date, line.date) });
  }
  const matchedLines = new Set(matches.map((m) => m.line));
  const first = lines.reduce((min, l) => (l.date < min ? l.date : min), lines[0]?.date ?? "");
  const last = lines.reduce((max, l) => (l.date > max ? l.date : max), lines[0]?.date ?? "");
  return {
    matches: matches.sort((a, b) => a.line - b.line),
    /** En el banco pero no en la plataforma: comisiones, intereses, depósitos sin registrar. */
    unmatchedLines: lines.map((_, i) => i).filter((i) => !matchedLines.has(i)),
    /** En la plataforma, dentro del periodo del archivo, pero no en el banco y sin conciliar. */
    unmatchedMovements: movements.filter((m) => !used.has(m.id) && !m.reconciled && m.date >= first && m.date <= last).map((m) => m.id),
  };
}
