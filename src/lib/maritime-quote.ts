// Lógica de cálculo de la cotización marítima (solicitud de impuestos de importación).
// Función pura, compartida por el formulario (vista previa en vivo) y el PDF.

export const IVA_RATE = 0.16;

/** Fracciones por % de IGI (ad valorem). EX = exenta (IGI 0). */
export const ADV_BRACKETS = [
  { key: "25", label: "25%", rate: 0.25 },
  { key: "20", label: "20%", rate: 0.2 },
  { key: "15", label: "15%", rate: 0.15 },
  { key: "10", label: "10%", rate: 0.1 },
  { key: "5", label: "5%", rate: 0.05 },
  { key: "0", label: "0%", rate: 0 },
  { key: "EX", label: "EX", rate: 0 },
] as const;

export type AdvKey = (typeof ADV_BRACKETS)[number]["key"];

/** Campos de gastos capturados manualmente, en el orden y columna del documento. */
export const EXPENSE_FIELDS = [
  // Columna izquierda
  { key: "dta", label: "DTA", column: "left" },
  { key: "prevalidacion", label: "Prevalidación", column: "left" },
  { key: "transitoInterno", label: "Tránsito interno", column: "left" },
  { key: "maniobras", label: "Maniobras", column: "left" },
  { key: "muellajes", label: "Muellajes", column: "left" },
  { key: "almacenajes", label: "Almacenajes", column: "left" },
  { key: "demoras", label: "Demoras", column: "left" },
  // Columna derecha
  { key: "cuota80", label: "Cuota 80%", column: "right" },
  { key: "demorasCamion", label: "Demoras d camión", column: "right" },
  { key: "fleteTerrestre", label: "Flete terrestre GDL", column: "right" },
  { key: "maniobraVacio", label: "Maniobra de vacío", column: "right" },
  { key: "maniobrasAlmacenAduana", label: "Maniobras almacén aduana GDL", column: "right" },
  { key: "gastosLocalesAduana", label: "Gastos locales aduana GDL", column: "right" },
  { key: "etiquetado", label: "Etiquetado", column: "right" },
  { key: "comercializacionPadronTextil", label: "Comercialización padrón textil", column: "right" },
  { key: "garantiaContenedor", label: "Garantía de contenedor", column: "right" },
  { key: "vucem", label: "VUCEM", column: "right" },
  { key: "validacion", label: "Validación", column: "right" },
  { key: "registroExportacion", label: "Registro exportación", column: "right" },
  { key: "honorariosAA", label: "Honorarios A.A.", column: "right" },
  { key: "complementariosAA", label: "Complementarios A.A. (PED, VUCEM)", column: "right" },
  { key: "ivaPorGastos", label: "IVA por gastos", column: "right" },
] as const;

export type ExpenseKey = (typeof EXPENSE_FIELDS)[number]["key"];

export type MaritimeExpenses = Record<ExpenseKey, number>;

export interface MaritimeQuoteInput {
  reference: string;
  client: string; // CLIENTE (encabezado)
  invoiceNumbers: string; // Factura(s) No.(s)
  invoiceDate: string; // de Fecha
  clientName: string; // Clientes (p. ej. GRUPO V NIETO)
  fractions: string[]; // hasta 3 fracciones arancelarias
  eta: string;
  // Cálculo del valor en aduana (capturado en USD)
  invoiceValueUsd: number; // Valor Factura
  internationalFreightUsd: number; // Flete Internacional
  insuranceUsd: number; // Seguro
  othersUsd: number; // Otros
  exchangeRate: number; // Tipo de Cambio
  // Valor en aduana por fracción (valor en moneda extranjera) → IGI
  brackets: Record<AdvKey, number>;
  // Gastos/impuestos manuales
  expenses: MaritimeExpenses;
  // Pie del documento
  restricciones: string;
  bankName: string;
  clabe: string;
  accountNumber: string;
  elaboro: string;
  aprobo: string;
  validUntil: string; // ISO (YYYY-MM-DD)
}

export interface ComputedBracket {
  key: AdvKey;
  label: string;
  rate: number;
  valueForeign: number;
  valuePesos: number;
  igi: number;
}

export interface MaritimeQuoteComputed {
  totalIncrementables: number; // flete + seguro + otros
  valorAduanaUsd: number; // factura + incrementables (informativo)
  brackets: ComputedBracket[];
  totalForeign: number;
  totalPesos: number; // TOTAL VALOR EN ADUANA (pesos)
  totalIgi: number;
  iva: number; // IVA principal = 16% (valorAduanaPesos + IGI + DTA)
  totalADepositar: number;
}

function num(v: number | undefined | null): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

export function computeMaritimeQuote(input: MaritimeQuoteInput): MaritimeQuoteComputed {
  const tc = num(input.exchangeRate);

  const totalIncrementables =
    num(input.internationalFreightUsd) + num(input.insuranceUsd) + num(input.othersUsd);
  const valorAduanaUsd = num(input.invoiceValueUsd) + totalIncrementables;

  const brackets: ComputedBracket[] = ADV_BRACKETS.map((b) => {
    const valueForeign = num(input.brackets?.[b.key]);
    const valuePesos = valueForeign * tc;
    return {
      key: b.key,
      label: b.label,
      rate: b.rate,
      valueForeign,
      valuePesos,
      igi: valuePesos * b.rate,
    };
  });

  const totalForeign = brackets.reduce((s, b) => s + b.valueForeign, 0);
  const totalPesos = brackets.reduce((s, b) => s + b.valuePesos, 0);
  const totalIgi = brackets.reduce((s, b) => s + b.igi, 0);

  const dta = num(input.expenses?.dta);
  const iva = IVA_RATE * (totalPesos + totalIgi + dta);

  const expensesTotal = EXPENSE_FIELDS.reduce(
    (s, f) => s + num(input.expenses?.[f.key]),
    0
  );

  // TOTAL A DEPOSITAR = IGI + IVA principal + todos los gastos/impuestos manuales (incluye DTA).
  const totalADepositar = totalIgi + iva + expensesTotal;

  return {
    totalIncrementables,
    valorAduanaUsd,
    brackets,
    totalForeign,
    totalPesos,
    totalIgi,
    iva,
    totalADepositar,
  };
}

/** Estado vacío con todos los gastos en 0 (para el formulario nuevo). */
export function emptyExpenses(): MaritimeExpenses {
  return EXPENSE_FIELDS.reduce((acc, f) => {
    acc[f.key] = 0;
    return acc;
  }, {} as MaritimeExpenses);
}

/** Brackets vacíos (todas las fracciones en 0). */
export function emptyBrackets(): Record<AdvKey, number> {
  return ADV_BRACKETS.reduce((acc, b) => {
    acc[b.key] = 0;
    return acc;
  }, {} as Record<AdvKey, number>);
}
