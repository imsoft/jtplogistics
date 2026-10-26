/**
 * Administración: cuentas por cobrar y por pagar, bancos y gastos.
 *
 * Puro y sin base de datos, para poder probarlo. Los montos se redondean a
 * centavos en cada paso para que la suma de pagos cuadre con el total.
 */

export type Currency = "MXN" | "USD";
export type BillingKind = "receivable" | "payable";
export type DocumentStatus = "borrador" | "pendiente" | "parcial" | "pagada" | "vencida" | "cancelada";

/** Redondeo a centavos. */
export const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Tolerancia para considerar saldada una factura (diferencias de centavos). */
export const SETTLED_TOLERANCE = 0.01;

export const BILLING_KIND_LABELS: Record<BillingKind, { plural: string; singular: string; party: string; payment: string }> = {
  receivable: { plural: "Cuentas por cobrar", singular: "Factura a cliente", party: "Cliente", payment: "Cobro" },
  payable: { plural: "Cuentas por pagar", singular: "Factura de proveedor", party: "Proveedor", payment: "Pago" },
};

export const DOCUMENT_STATUS: Record<DocumentStatus, { label: string; badgeClass: string }> = {
  borrador: { label: "Borrador", badgeClass: "bg-violet-100 text-violet-800" },
  pendiente: { label: "Pendiente", badgeClass: "bg-blue-100 text-blue-800" },
  parcial: { label: "Pago parcial", badgeClass: "bg-amber-100 text-amber-800" },
  pagada: { label: "Pagada", badgeClass: "bg-green-100 text-green-800" },
  vencida: { label: "Vencida", badgeClass: "bg-red-100 text-red-800" },
  cancelada: { label: "Cancelada", badgeClass: "bg-gray-100 text-gray-700" },
};

/** Formas de pago del SAT (c_FormaPago) que usa una empresa de logística. */
export const SAT_PAYMENT_FORMS: { value: string; label: string }[] = [
  { value: "03", label: "03 · Transferencia electrónica" },
  { value: "01", label: "01 · Efectivo" },
  { value: "02", label: "02 · Cheque nominativo" },
  { value: "04", label: "04 · Tarjeta de crédito" },
  { value: "28", label: "28 · Tarjeta de débito" },
  { value: "17", label: "17 · Compensación" },
  { value: "99", label: "99 · Por definir" },
];

export const EXPENSE_CATEGORIES: string[] = [
  "Renta",
  "Servicios (luz, agua, internet, teléfono)",
  "Nómina",
  "Impuestos",
  "Combustible",
  "Casetas",
  "Mantenimiento",
  "Seguros",
  "Software y suscripciones",
  "Papelería y oficina",
  "Honorarios",
  "Comisiones bancarias",
  "Viáticos",
  "Otros",
];

/** Tasas de retención de IVA que se usan en la práctica. */
export const IVA_WITHHOLDING_OPTIONS = [
  { value: "0", label: "Sin retención" },
  { value: "0.04", label: "4 % (autotransporte de carga)" },
  { value: "0.106667", label: "10.6667 % (servicios profesionales / arrendamiento)" },
];

/** IVA, retención y total a partir del subtotal. */
export function computeTotals(input: { subtotal: number; ivaRate: number; withholdingRate: number }) {
  const subtotal = r2(input.subtotal);
  const iva = r2(subtotal * input.ivaRate);
  const ivaWithheld = r2(subtotal * input.withholdingRate);
  return { subtotal, iva, ivaWithheld, total: r2(subtotal + iva - ivaWithheld) };
}

/** Saldo y estado de una factura. `todayKey` y `dueDate` son "YYYY-MM-DD". */
export function documentStatus(input: {
  total: number;
  paid: number;
  dueDate: string;
  cancelled: boolean;
  /** Borrador: todavía no es factura, así que no hay saldo que cobrar o pagar. */
  draft?: boolean;
  todayKey: string;
}): { status: DocumentStatus; balance: number } {
  const balance = r2(input.total - input.paid);
  if (input.cancelled) return { status: "cancelada", balance: 0 };
  if (input.draft) return { status: "borrador", balance: 0 };
  if (balance <= SETTLED_TOLERANCE) return { status: "pagada", balance: 0 };
  if (input.dueDate < input.todayKey) return { status: "vencida", balance };
  if (input.paid > SETTLED_TOLERANCE) return { status: "parcial", balance };
  return { status: "pendiente", balance };
}

/**
 * Cuánto entra o sale de la cuenta por un pago, en la moneda de la cuenta.
 * `rate` son pesos por dólar.
 */
export function bankAmountFor(amount: number, docCurrency: Currency, accountCurrency: Currency, rate: number): number {
  if (docCurrency === accountCurrency) return r2(amount);
  if (docCurrency === "USD" && accountCurrency === "MXN") return r2(amount * rate);
  return r2(amount / rate);
}

/** Un monto expresado en pesos, para sumar facturas de las dos monedas. */
export function toMxn(amount: number, currency: Currency, rate: number): number {
  return currency === "MXN" ? r2(amount) : r2(amount * rate);
}

/** Valida un pago contra el saldo pendiente. */
export function paymentError(amount: number, balance: number): string | null {
  if (!Number.isFinite(amount) || amount <= 0) return "El monto debe ser mayor a cero.";
  if (amount > balance + SETTLED_TOLERANCE) return `El monto pasa del saldo pendiente (${balance.toFixed(2)}).`;
  return null;
}

/** Días de atraso de una factura vencida (0 si no está vencida). */
export function daysOverdue(dueDate: string, todayKey: string): number {
  if (dueDate >= todayKey) return 0;
  const ms = Date.parse(`${todayKey}T00:00:00Z`) - Date.parse(`${dueDate}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/** Antigüedad de saldos: en qué rango cae una factura pendiente. */
export type AgingBucket = "al_corriente" | "1_30" | "31_60" | "61_90" | "90_mas";

export const AGING_LABELS: Record<AgingBucket, string> = {
  al_corriente: "Al corriente",
  "1_30": "1 a 30 días",
  "31_60": "31 a 60 días",
  "61_90": "61 a 90 días",
  "90_mas": "Más de 90 días",
};

export function agingBucket(dueDate: string, todayKey: string): AgingBucket {
  const d = daysOverdue(dueDate, todayKey);
  if (d === 0) return "al_corriente";
  if (d <= 30) return "1_30";
  if (d <= 60) return "31_60";
  if (d <= 90) return "61_90";
  return "90_mas";
}

/**
 * Una transferencia que paga varias facturas del mismo cliente o proveedor y
 * en la misma moneda. Valida cada monto contra su saldo y reparte lo que
 * entra o sale del banco: un solo movimiento por la suma.
 */
export function planBatchPayment(
  docs: { id: string; kind: BillingKind; partyName: string; currency: Currency; total: number; paid: number; draft: boolean; cancelled: boolean }[],
  items: { documentId: string; amount: number }[],
  accountCurrency: Currency,
  rate: number
):
  | { ok: true; kind: BillingKind; currency: Currency; items: { documentId: string; amount: number; bankAmount: number }[]; total: number; bankTotal: number }
  | { ok: false; error: string } {
  if (items.length < 2) return { ok: false, error: "Elige al menos dos facturas." };
  if (new Set(items.map((i) => i.documentId)).size !== items.length) return { ok: false, error: "Una factura viene repetida." };
  const byId = new Map(docs.map((d) => [d.id, d]));
  const chosen = items.map((i) => byId.get(i.documentId));
  if (chosen.some((d) => !d)) return { ok: false, error: "Alguna factura ya no existe." };
  const list = chosen as NonNullable<(typeof chosen)[number]>[];
  const [first] = list;
  if (list.some((d) => d.kind !== first.kind)) return { ok: false, error: "No se pueden mezclar cobros y pagos." };
  if (list.some((d) => d.currency !== first.currency)) return { ok: false, error: "Todas las facturas deben estar en la misma moneda." };
  if (list.some((d) => d.partyName.trim().toLowerCase() !== first.partyName.trim().toLowerCase())) {
    return { ok: false, error: `Todas las facturas deben ser del mismo ${first.kind === "receivable" ? "cliente" : "proveedor"}.` };
  }
  if (list.some((d) => d.draft)) return { ok: false, error: "Hay un borrador entre las facturas." };
  if (list.some((d) => d.cancelled)) return { ok: false, error: "Hay una factura cancelada entre las elegidas." };
  if (first.currency !== accountCurrency && !(rate > 0)) return { ok: false, error: "Escribe el tipo de cambio del día del pago." };

  const planned: { documentId: string; amount: number; bankAmount: number }[] = [];
  for (const [i, item] of items.entries()) {
    const d = list[i];
    const amount = r2(item.amount);
    const err = paymentError(amount, r2(d.total - d.paid));
    if (err) return { ok: false, error: `Factura ${i + 1}: ${err}` };
    planned.push({ documentId: d.id, amount, bankAmount: bankAmountFor(amount, d.currency, accountCurrency, first.currency === accountCurrency ? 1 : rate) });
  }
  return {
    ok: true,
    kind: first.kind,
    currency: first.currency,
    items: planned,
    total: r2(planned.reduce((s, p) => s + p.amount, 0)),
    bankTotal: r2(planned.reduce((s, p) => s + p.bankAmount, 0)),
  };
}
