import type { UserRole } from "@/types/roles";

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  carrier: "Transportista",
  collaborator: "Colaborador",
  vendor: "Vendedor",
  developer: "Desarrollador",
};
