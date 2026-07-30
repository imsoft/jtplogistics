import { prisma } from "@/lib/db";
import { muralHandler } from "@/lib/mural-auth";

/**
 * Personal interno (admin y colaboradores) para el selector de "colaborador"
 * al registrar vacaciones u otras entradas del mural.
 */
export function GET() {
  return muralHandler("canViewMural", async () => {
    const users = await prisma.user.findMany({
      where: { role: { in: ["admin", "collaborator"] } },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        image: true,
        position: true,
        employeeProfile: { select: { position: true } },
      },
    });

    return Response.json(
      users.map((u) => ({
        id: u.id,
        name: u.name,
        image: u.image,
        position: u.position ?? u.employeeProfile?.position ?? null,
      }))
    );
  });
}
