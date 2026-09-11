/**
 * La cuenta de proveedor detrás de cada petición.
 *
 * Todo lo del transportista (tarifas, mensajes, perfil de la empresa) está
 * amarrado al id de su usuario principal. Un usuario agregado no tiene datos
 * propios: trabaja sobre los del principal, con los permisos que este le dio.
 */

import { prisma } from "@/lib/db";
import { requireCarrier } from "@/lib/auth-server";
import { carrierAbilities, type CarrierAbility } from "@/lib/carrier-permissions";

const MEMBER_SELECT = {
  parentCarrierId: true,
  memberCanViewRates: true,
  memberCanEditRates: true,
  memberCanMessage: true,
  memberCanSuggest: true,
  memberCanEditCompany: true,
  memberRevokedAt: true,
} as const;

function forbidden(message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Exige un transportista y, si se pide, un permiso. Devuelve con qué empresa
 * trabaja (carrierId) y quién es de verdad (userId), que no siempre coinciden.
 */
export async function requireCarrierAccount(ability?: CarrierAbility) {
  const session = await requireCarrier();
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: MEMBER_SELECT,
  });

  // Quitarle el acceso borra su contraseña y sesiones, pero una sesión que
  // estuviera a medio vuelo no debe alcanzar a hacer nada.
  if (!me || me.memberRevokedAt) throw forbidden("Tu acceso fue retirado.");

  const can = carrierAbilities(me);
  if (ability && !can[ability]) {
    throw forbidden(
      "Tu usuario no tiene permiso para esto. Pídeselo al usuario principal de tu empresa."
    );
  }

  return {
    session,
    /** Quien hace la petición. Es el que va en la bitácora y en los mensajes. */
    userId: session.user.id,
    /** La empresa: todo dato del proveedor se busca con este id. */
    carrierId: me.parentCarrierId ?? session.user.id,
    isPrincipal: !me.parentCarrierId,
    can,
  };
}
