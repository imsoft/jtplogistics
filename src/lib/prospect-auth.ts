/**
 * Quién puede usar la prospección de proveedores. La regla vive en
 * module-access.ts, compartida con el resto de módulos con permiso propio.
 */

import { requireModuleAccess, type ModuleAction } from "@/lib/module-access";

export function requireProspectAccess(action: ModuleAction) {
  return requireModuleAccess("ProviderProspects", action);
}
