import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formatea un número de teléfono para mostrarlo.
 * 10 dígitos → "33 3410 9866"
 * 12 dígitos con 52 → "+52 33 3410 9866"
 * Cualquier otro formato → se devuelve sin cambios.
 */
export function formatPhone(value: string | null | undefined): string {
  if (!value) return "";
  const d = value.replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("52")) {
    return `+52 ${d.slice(2, 4)} ${d.slice(4, 8)} ${d.slice(8)}`;
  }
  if (d.length === 10) {
    return `${d.slice(0, 2)} ${d.slice(2, 6)} ${d.slice(6)}`;
  }
  return value;
}

/**
 * Formatea un IMEI de 15 dígitos como "35 094981 137257 6".
 */
export function formatIMEI(value: string | null | undefined): string {
  if (!value) return "";
  const d = value.replace(/\D/g, "");
  if (d.length === 15) {
    return `${d.slice(0, 2)} ${d.slice(2, 8)} ${d.slice(8, 14)} ${d.slice(14)}`;
  }
  return value;
}

/** Formatea un número como precio en pesos (miles con coma, decimales con punto). */
export function formatMxn(value: number): string {
  if (Number.isNaN(value) || value == null) return ""
  const fixed = value.toFixed(2)
  const [int, dec] = fixed.split(".")
  const withCommas = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  return dec != null ? `${withCommas}.${dec}` : withCommas
}

/** Parsea un string de precio MXN (ej. "1,234.56") a número. */
export function parseMxn(value: string): number | undefined {
  if (value == null || value.trim() === "") return undefined
  const cleaned = value.replace(/,/g, "").trim()
  const num = Number.parseFloat(cleaned)
  return Number.isNaN(num) ? undefined : num
}

/**
 * Formatea mientras se escribe: solo dígitos y un punto decimal,
 * parte entera con comas. Preserva el punto para poder escribir centavos.
 * Ej: "1500." -> "1,500."  "1500.5" -> "1,500.5"
 */
export function formatMxnLive(value: string): string {
  const cleaned = value.replace(/,/g, "").replace(/[^\d.]/g, "")
  if (cleaned === ".") return "."
  const dotIndex = cleaned.indexOf(".")
  const intPart = dotIndex === -1 ? cleaned : cleaned.slice(0, dotIndex)
  const afterDot = dotIndex === -1 ? "" : cleaned.slice(dotIndex + 1).replace(/\D/g, "")
  const decPart = afterDot.slice(0, 2)
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  const hasDecimal = cleaned.includes(".")
  if (!formattedInt && !decPart && !hasDecimal) return ""
  if (!formattedInt) return hasDecimal ? `0.${decPart}` : (decPart ? `0.${decPart}` : "")
  return hasDecimal ? `${formattedInt}.${decPart}` : formattedInt
}
