/**
 * Alta de proveedores: catálogos y reglas puras (sin base de datos, para poder
 * probarlas). Sustituye el Excel "Proceso de alta" de Finanzas.
 */

export const DOC_STATUSES = [
  { value: "pending", label: "Pendiente", short: "—" },
  { value: "received", label: "Recibido", short: "✓" },
  { value: "not_applicable", label: "No aplica", short: "N/A" },
] as const;
export type DocStatus = (typeof DOC_STATUSES)[number]["value"];
export const DOC_STATUS_VALUES = DOC_STATUSES.map((d) => d.value) as readonly string[];

/** El expediente, en el orden del Excel. `key` es el campo en la base. */
export const ONBOARDING_DOCS = [
  { key: "docAltaJtp", label: "Alta JTP", short: "Alta" },
  { key: "docBilling", label: "Proceso de facturación", short: "Fact." },
  { key: "docTaxCertificate", label: "Constancia de situación fiscal", short: "Const." },
  { key: "docOpinion", label: "Opinión de cumplimiento", short: "Opinión" },
  { key: "docAddressProof", label: "Comprobante de domicilio", short: "Domicilio" },
  { key: "docIne", label: "INE", short: "INE" },
  { key: "docArticles", label: "Acta constitutiva", short: "Acta" },
  { key: "docPower", label: "Poder notarial", short: "Poder" },
] as const;
export type DocKey = (typeof ONBOARDING_DOCS)[number]["key"];
export type DocRecord = Record<DocKey, DocStatus>;

export const CONTRACT_STATUSES = [
  { value: "not_requested", label: "Sin solicitar", badgeClass: "bg-gray-100 text-gray-800" },
  { value: "requested_legal", label: "Solicitado a jurídico", badgeClass: "bg-amber-100 text-amber-900" },
  { value: "sent_to_provider", label: "Enviado al proveedor, pendiente de firma", badgeClass: "bg-blue-100 text-blue-800" },
  { value: "received_signed", label: "Recibido firmado", badgeClass: "bg-green-100 text-green-800" },
  { value: "docs_updated", label: "Actualización de documentos", badgeClass: "bg-indigo-100 text-indigo-800" },
] as const;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number]["value"];
export const CONTRACT_STATUS_VALUES = CONTRACT_STATUSES.map((c) => c.value) as readonly string[];
export const CONTRACT_STATUS_LABELS = Object.fromEntries(CONTRACT_STATUSES.map((c) => [c.value, c.label])) as Record<ContractStatus, string>;

export function isDocStatus(v: unknown): v is DocStatus {
  return typeof v === "string" && DOC_STATUS_VALUES.includes(v);
}
export function isContractStatus(v: unknown): v is ContractStatus {
  return typeof v === "string" && CONTRACT_STATUS_VALUES.includes(v);
}

/** Cuántos documentos ya están resueltos (recibidos o no aplican) de los 8. */
export function docProgress(docs: DocRecord): { done: number; total: number; pending: DocKey[] } {
  const pending = ONBOARDING_DOCS.filter((d) => docs[d.key] === "pending").map((d) => d.key);
  return { done: ONBOARDING_DOCS.length - pending.length, total: ONBOARDING_DOCS.length, pending };
}

/** El Excel marca COMPLETO cuando ningún documento queda pendiente. */
export function isDocsComplete(docs: DocRecord): boolean {
  return docProgress(docs).pending.length === 0;
}

/**
 * Qué estado general mostrar. Detenido manda sobre todo; luego, completo o en
 * proceso según el expediente.
 */
export type OnboardingStage = "on_hold" | "complete" | "in_progress";
export function onboardingStage(row: { onHoldSince: string | null; docs: DocRecord }): OnboardingStage {
  if (row.onHoldSince) return "on_hold";
  return isDocsComplete(row.docs) ? "complete" : "in_progress";
}

export const STAGE_LABELS: Record<OnboardingStage, string> = {
  in_progress: "En proceso",
  complete: "Completo",
  on_hold: "Detenido",
};

/**
 * Fecha de alta completa que debe quedar guardada tras un cambio: si el
 * expediente acaba de completarse y no había fecha, hoy; si se destapó un
 * pendiente, se conserva lo que hubiera (Finanzas decide si la borra).
 */
export function completedOnAfterChange(
  docs: DocRecord,
  current: string | null,
  today: string
): string | null {
  if (isDocsComplete(docs) && !current) return today;
  return current;
}

/** Detener exige motivo; reactivar lo limpia. */
export function validateHold(input: { onHold: boolean; holdReason: string }): string | null {
  if (input.onHold && input.holdReason.trim().length < 3) return "Escribe por qué se detiene el alta.";
  return null;
}
