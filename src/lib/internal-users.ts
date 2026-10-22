import { prisma } from "@/lib/db";
import { ACTIVE_USERS } from "@/lib/offboarding";

/** Gente de JTP activa: dirección y colaboradores (sin transportistas ni vendedores). */
export function listInternalUsers() {
  return prisma.user.findMany({
    where: { role: { in: ["admin", "collaborator"] }, ...ACTIVE_USERS },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function isInternalUser(id: string): Promise<boolean> {
  const u = await prisma.user.findFirst({
    where: { id, role: { in: ["admin", "collaborator"] }, ...ACTIVE_USERS },
    select: { id: true },
  });
  return u !== null;
}
