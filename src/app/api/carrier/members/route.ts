import { requireCarrierAccount } from "@/lib/carrier-account";
import { JTP_MANAGES_MEMBERS, listCarrierMembers } from "@/lib/carrier-members-server";

/**
 * GET /api/carrier/members — los usuarios de la empresa, para consultarlos.
 * Solo el principal. Darlos de alta, cambiar permisos y quitarlos lo hace JTP
 * desde su panel (ver /api/admin/carriers/[id]/members).
 */
export async function GET() {
  try {
    const { carrierId } = await requireCarrierAccount("manageUsers");
    return Response.json({ members: await listCarrierMembers(carrierId), canManage: false });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[carrier/members] GET", e);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

/** POST — ya no: los usuarios del proveedor los administra JTP. */
export async function POST() {
  try {
    await requireCarrierAccount();
    return Response.json({ error: JTP_MANAGES_MEMBERS }, { status: 403 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[carrier/members] POST", e);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
