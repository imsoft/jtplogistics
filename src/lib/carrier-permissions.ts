/**
 * Qué puede hacer cada usuario de un proveedor dentro de su empresa.
 *
 * Puro y sin base de datos, para poder probarlo: es la regla que decide qué
 * ve un tercero dentro del sistema de JTP.
 */

export type CarrierAbility =
  | "viewRates"
  | "editRates"
  | "message"
  | "suggest"
  | "editCompany"
  | "manageUsers";

/** Los permisos que el principal puede dar, en el orden en que se muestran. */
export const CARRIER_MEMBER_PERMISSIONS = [
  {
    key: "memberCanViewRates",
    ability: "viewRates",
    label: "Tarifas: ver",
    hint: "Ver las rutas y lo que la empresa tiene capturado.",
  },
  {
    key: "memberCanEditRates",
    ability: "editRates",
    label: "Tarifas: capturar",
    hint: "Poner precio y volumen. Incluye ver. Siempre dentro de los candados que JTP pone a la empresa.",
  },
  {
    key: "memberCanMessage",
    ability: "message",
    label: "Mensajes con JTP",
    hint: "Ver y responder la conversación de la empresa. Cada mensaje queda con su nombre.",
  },
  {
    key: "memberCanSuggest",
    ability: "suggest",
    label: "Sugerencias de rutas",
    hint: "Proponer rutas nuevas a nombre de la empresa.",
  },
  {
    key: "memberCanEditCompany",
    ability: "editCompany",
    label: "Datos de la empresa",
    hint: "Editar razón social, RFC, domicilio y contactos.",
  },
] as const;

export type CarrierMemberPermissionKey = (typeof CARRIER_MEMBER_PERMISSIONS)[number]["key"];

export interface CarrierAccountRow {
  parentCarrierId: string | null;
  memberCanViewRates: boolean;
  memberCanEditRates: boolean;
  memberCanMessage: boolean;
  memberCanSuggest: boolean;
  memberCanEditCompany: boolean;
}

/**
 * El principal lo puede todo en su empresa, incluido administrar usuarios, que
 * no se delega: así lo pidió el cliente.
 */
export function carrierAbilities(user: CarrierAccountRow): Record<CarrierAbility, boolean> {
  if (!user.parentCarrierId) {
    return {
      viewRates: true,
      editRates: true,
      message: true,
      suggest: true,
      editCompany: true,
      manageUsers: true,
    };
  }
  return {
    // Capturar sin poder ver no tiene sentido: editar implica ver.
    viewRates: user.memberCanViewRates || user.memberCanEditRates,
    editRates: user.memberCanEditRates,
    message: user.memberCanMessage,
    suggest: user.memberCanSuggest,
    editCompany: user.memberCanEditCompany,
    manageUsers: false,
  };
}

/** Solo las columnas de permisos, tomadas de un body sin confiar en él. */
export function pickMemberPermissions(
  body: Record<string, unknown>
): Partial<Record<CarrierMemberPermissionKey, boolean>> {
  const out: Partial<Record<CarrierMemberPermissionKey, boolean>> = {};
  for (const p of CARRIER_MEMBER_PERMISSIONS) {
    if (typeof body[p.key] === "boolean") out[p.key] = body[p.key] as boolean;
  }
  return out;
}
