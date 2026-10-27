import { prisma } from "@/lib/db";
import { requireCollaboratorOrAdmin } from "@/lib/auth-server";
import { ACTIVE_USERS } from "@/lib/offboarding";

/**
 * Directorio mínimo del equipo para los selectores (asignar laptop, teléfono,
 * correo): id, nombre, correo y puesto. Sin datos de RH (NSS, CURP, RFC,
 * domicilio): esos siguen en Colaboradores, con su permiso. Antes los
 * selectores pedían esa lista completa y, sin permiso de Colaboradores, se
 * quedaban vacíos.
 */
export async function GET() {
  try {
    await requireCollaboratorOrAdmin();
    const people = await prisma.user.findMany({
      where: { ...ACTIVE_USERS, role: { in: ["collaborator", "admin", "developer"] } },
      select: { id: true, name: true, email: true, employeeProfile: { select: { position: true } } },
      orderBy: { name: "asc" },
    });
    return Response.json(people.map((p) => ({ id: p.id, name: p.name, email: p.email, position: p.employeeProfile?.position ?? null })));
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[collaborator/people]", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
