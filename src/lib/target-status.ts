export type TargetStatus = "verde" | "amarillo" | "rojo";

/**
 * Semáforo del target del proveedor contra el target de JTP.
 * Fórmula: =SI(A>=B, "verde", SI(B<=(A*1.05), "amarillo", "rojo"))
 * donde A = target de JTP y B = target del proveedor.
 * Nunca exponer el target de JTP al transportista; solo el color.
 */
export function computeTargetStatus(
  jtpTarget: number | null | undefined,
  carrierTarget: number | null | undefined
): TargetStatus | null {
  if (jtpTarget == null || jtpTarget <= 0 || carrierTarget == null || carrierTarget <= 0) {
    return null;
  }
  if (jtpTarget >= carrierTarget) return "verde";
  if (carrierTarget <= jtpTarget * 1.05) return "amarillo";
  return "rojo";
}
