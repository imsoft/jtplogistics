import type { MuralEntryType, MuralItemKind } from "@/types/mural.types";

export const MURAL_ENTRY_TYPES: MuralEntryType[] = ["event", "training", "vacation"];

export const MURAL_KIND_LABELS: Record<MuralItemKind, string> = {
  event: "Evento",
  training: "Capacitación",
  vacation: "Vacaciones",
  birthday: "Cumpleaños",
  anniversary: "Aniversario",
};

export const MURAL_KIND_COLORS: Record<MuralItemKind, string> = {
  event: "bg-blue-100 text-blue-700",
  training: "bg-blue-200 text-blue-900",
  vacation: "bg-amber-100 text-amber-700",
  birthday: "bg-green-100 text-green-700",
  anniversary: "bg-slate-200 text-slate-800",
};

/**
 * Acentos del mural: cada tipo se reconoce por su color antes de leer la
 * etiqueta. Las clases se escriben completas porque Tailwind no puede
 * resolverlas si se arman concatenando cadenas.
 */
export interface MuralKindAccent {
  /** Fondo suave del avatar cuando la persona no tiene foto. */
  soft: string;
  /** Punto del día en la línea de tiempo. */
  dot: string;
  /** Anillo alrededor de la foto. */
  ring: string;
  /** Fondo y borde del bloque de la categoría. */
  panel: string;
  /** Franja del encabezado del bloque. */
  header: string;
}

export const MURAL_KIND_ACCENTS: Record<MuralItemKind, MuralKindAccent> = {
  event: {
    soft: "bg-blue-50 text-blue-600",
    dot: "bg-blue-400",
    ring: "ring-blue-200",
    panel: "border-blue-200 bg-blue-50/60",
    header: "bg-blue-100 text-blue-800",
  },
  training: {
    soft: "bg-blue-100 text-blue-800",
    dot: "bg-blue-700",
    ring: "ring-blue-400",
    panel: "border-blue-300 bg-blue-100/50",
    header: "bg-blue-200 text-blue-900",
  },
  vacation: {
    soft: "bg-amber-50 text-amber-600",
    dot: "bg-amber-400",
    ring: "ring-amber-200",
    panel: "border-amber-200 bg-amber-50/60",
    header: "bg-amber-100 text-amber-800",
  },
  birthday: {
    soft: "bg-green-50 text-green-600",
    dot: "bg-green-400",
    ring: "ring-green-200",
    panel: "border-green-200 bg-green-50/60",
    header: "bg-green-100 text-green-800",
  },
  anniversary: {
    soft: "bg-slate-100 text-slate-700",
    dot: "bg-slate-500",
    ring: "ring-slate-300",
    panel: "border-slate-200 bg-slate-50/80",
    header: "bg-slate-200 text-slate-800",
  },
};

export function isMuralEntryType(value: unknown): value is MuralEntryType {
  return (
    value === "event" || value === "vacation" || value === "training"
  );
}
