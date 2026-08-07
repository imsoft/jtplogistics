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
  training: "bg-violet-100 text-violet-700",
  vacation: "bg-amber-100 text-amber-700",
  birthday: "bg-pink-100 text-pink-700",
  anniversary: "bg-emerald-100 text-emerald-700",
};

/**
 * Acentos del mural: cada tipo se reconoce por su color antes de leer la
 * etiqueta. Las clases se escriben completas porque Tailwind no puede
 * resolverlas si se arman concatenando cadenas.
 */
export interface MuralKindAccent {
  /** Filo de color a la izquierda de la tarjeta. */
  edge: string;
  /** Fondo suave del avatar cuando la persona no tiene foto. */
  soft: string;
  /** Punto del día en la línea de tiempo. */
  dot: string;
  /** Anillo alrededor de la foto. */
  ring: string;
}

export const MURAL_KIND_ACCENTS: Record<MuralItemKind, MuralKindAccent> = {
  event: {
    edge: "border-l-blue-400",
    soft: "bg-blue-50 text-blue-600",
    dot: "bg-blue-400",
    ring: "ring-blue-200",
  },
  training: {
    edge: "border-l-violet-400",
    soft: "bg-violet-50 text-violet-600",
    dot: "bg-violet-400",
    ring: "ring-violet-200",
  },
  vacation: {
    edge: "border-l-amber-400",
    soft: "bg-amber-50 text-amber-600",
    dot: "bg-amber-400",
    ring: "ring-amber-200",
  },
  birthday: {
    edge: "border-l-pink-400",
    soft: "bg-pink-50 text-pink-600",
    dot: "bg-pink-400",
    ring: "ring-pink-200",
  },
  anniversary: {
    edge: "border-l-emerald-400",
    soft: "bg-emerald-50 text-emerald-600",
    dot: "bg-emerald-400",
    ring: "ring-emerald-200",
  },
};

export function isMuralEntryType(value: unknown): value is MuralEntryType {
  return (
    value === "event" || value === "vacation" || value === "training"
  );
}
