import { prisma } from "@/lib/db";
import { requireCollaboratorOrAdmin } from "@/lib/auth-server";

export async function GET() {
  try {
    const session = await requireCollaboratorOrAdmin();

    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { canViewEmployees: true },
    });

    if (!me?.canViewEmployees) {
      return Response.json({ error: "Sin permiso" }, { status: 403 });
    }

    const employees = await prisma.user.findMany({
      where: { role: "collaborator" },
      orderBy: { createdAt: "desc" },
      include: { employeeProfile: true },
    });

    return Response.json(
      employees.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        image: u.image,
        birthDate: u.birthDate ? u.birthDate.toISOString().split("T")[0] : null,
        hireDate: u.employeeProfile?.hireDate
          ? u.employeeProfile.hireDate.toISOString().split("T")[0]
          : null,
        position: u.employeeProfile?.position ?? null,
        department: u.employeeProfile?.department ?? null,
        phone: u.employeeProfile?.phone ?? null,
        createdAt: u.createdAt.toISOString(),
      }))
    );
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
