import { gateRoutes } from "@/lib/route-auth";
import { listInternalUsers } from "@/lib/internal-users";

/** GET /api/routes/creators — a nombre de quién se puede registrar una carga masiva. */
export async function GET() {
  try {
    await gateRoutes("canCreateRoutes");
    return Response.json(await listInternalUsers());
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[routes/creators] GET", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
