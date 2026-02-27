import type { UnitType } from "@/types/route.types";

export const UNIT_TYPE_LABELS: Record<UnitType, string> = {
  dry_box: "Caja seca",
};

export const UNIT_TYPE_OPTIONS: { value: UnitType; label: string }[] = [
  { value: "dry_box", label: "Caja seca" },
];
