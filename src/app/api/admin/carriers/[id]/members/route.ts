import { adminOrDeveloperHandler } from "@/lib/api-handler";
import { findCarrierCompany } from "@/lib/admin-carrier-target";
import { createCarrierMember, listCarrierMembers } from "@/lib/carrier-members-server";

/** Usuarios de un proveedor, administrados por JTP. GET: lista; POST: da de alta. */
export function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return adminOrDeveloperHandler(async () => {
    const { id } = await params;
    if (!(await findCarrierCompany(id))) return Response.json({ error: "Proveedor no encontrado." }, { status: 404 });
    return Response.json({ members: await listCarrierMembers(id), canManage: true });
  });
}

export function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return adminOrDeveloperHandler(async (session) => {
    const { id } = await params;
    if (!(await findCarrierCompany(id))) return Response.json({ error: "Proveedor no encontrado." }, { status: 404 });
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    return createCarrierMember(id, { id: session.user.id, name: session.user.name }, body);
  });
}
