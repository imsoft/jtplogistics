import { requireDeveloper } from "@/lib/auth-server";
import { loadEmployeeDetail, serializeEmployeeDetail } from "@/lib/employees";

/** GET /api/developer/employees/[id] — la ficha completa, de solo lectura. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireDeveloper();
    const { id } = await params;
    const u = await loadEmployeeDetail(id);
    if (!u || u.role !== "collaborator") {
      return Response.json({ error: "No encontrado" }, { status: 404 });
    }
    return Response.json(serializeEmployeeDetail(u));
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[developer/employees/:id] GET", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
