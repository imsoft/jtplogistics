import { requireModuleAccess } from "@/lib/module-access";
import { LEADS_MODULE, leadOwners } from "@/lib/client-leads-server";

/** GET /api/client-leads/owners — quién puede quedar como responsable. */
export async function GET() {
  try {
    await requireModuleAccess(LEADS_MODULE, "view");
    return Response.json(await leadOwners());
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[client-leads/owners] GET", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
