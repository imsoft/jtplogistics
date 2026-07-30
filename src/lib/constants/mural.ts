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

export function isMuralEntryType(value: unknown): value is MuralEntryType {
  return (
    value === "event" || value === "vacation" || value === "training"
  );
}
