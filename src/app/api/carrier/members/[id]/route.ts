import { requireCarrierAccount } from "@/lib/carrier-account";
import { JTP_MANAGES_MEMBERS } from "@/lib/carrier-members-server";

/**
 * Cambiar permisos o quitar el acceso a un usuario del proveedor ya no lo hace
 * el proveedor: lo administra JTP (ver /api/admin/carriers/[id]/members).
 */
async function denied(): Promise<Response> {
  try {
    await requireCarrierAccount();
    return Response.json({ error: JTP_MANAGES_MEMBERS }, { status: 403 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[carrier/members/:id]", e);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

export function PATCH() {
  return denied();
}

export function DELETE() {
  return denied();
}
