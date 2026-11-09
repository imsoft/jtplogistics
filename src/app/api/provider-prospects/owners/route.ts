import { requireProspectAccess } from "@/lib/prospect-auth";
import { leadOwners } from "@/lib/client-leads-server";

/** GET /api/provider-prospects/owners — quién puede quedar como responsable. */
export async function GET() {
  try {
    await requireProspectAccess("view");
    return Response.json(await leadOwners());
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[provider-prospects/owners] GET", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
