import { adminOrDeveloperHandler } from "@/lib/api-handler";
import { findCarrierCompany } from "@/lib/admin-carrier-target";
import { revokeCarrierMember, updateCarrierMember } from "@/lib/carrier-members-server";

type Ctx = { params: Promise<{ id: string; memberId: string }> };

/** PATCH: cambia permisos de un usuario del proveedor (JTP). */
export function PATCH(request: Request, { params }: Ctx) {
  return adminOrDeveloperHandler(async (session) => {
    const { id, memberId } = await params;
    if (!(await findCarrierCompany(id))) return Response.json({ error: "Proveedor no encontrado." }, { status: 404 });
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    return updateCarrierMember(id, memberId, { id: session.user.id, name: session.user.name }, body);
  });
}

/** DELETE: le quita el acceso (JTP). */
export function DELETE(_req: Request, { params }: Ctx) {
  return adminOrDeveloperHandler(async (session) => {
    const { id, memberId } = await params;
    if (!(await findCarrierCompany(id))) return Response.json({ error: "Proveedor no encontrado." }, { status: 404 });
    return revokeCarrierMember(id, memberId, { id: session.user.id, name: session.user.name });
  });
}
