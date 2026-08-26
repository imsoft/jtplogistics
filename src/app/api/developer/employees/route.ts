import { prisma } from "@/lib/db";
import { requireDeveloper } from "@/lib/auth-server";
import { serializeEmployeeRow } from "@/lib/employees";

/**
 * GET /api/developer/employees
 * Directorio de colaboradores para soporte de TI: es de solo lectura, el alta
 * y la baja siguen siendo de dirección.
 */
export async function GET() {
  try {
    await requireDeveloper();
    const employees = await prisma.user.findMany({
      where: { role: "collaborator" },
      orderBy: { createdAt: "desc" },
      include: { employeeProfile: true },
    });
    return Response.json(employees.map(serializeEmployeeRow));
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[developer/employees] GET", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
