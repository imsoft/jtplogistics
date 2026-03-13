/**
 * Asigna un usuario como creador de todas las rutas que tienen createdById null.
 * Uso: pnpm run db:assign-route-creator
 * El ID por defecto es el usuario indicado; se puede sobrescribir con ASSIGN_ROUTE_CREATOR_USER_ID.
 */
import "dotenv/config";
import { prisma } from "../src/lib/db";

const DEFAULT_CREATOR_ID = "kQWE2YvCc2HIJnb4OUiaQiPg9ozjmD3q";

async function main() {
  const creatorId = process.env.ASSIGN_ROUTE_CREATOR_USER_ID ?? DEFAULT_CREATOR_ID;

  const user = await prisma.user.findUnique({ where: { id: creatorId } });
  if (!user) {
    console.error(`Usuario con id "${creatorId}" no encontrado.`);
    process.exit(1);
  }

  const result = await prisma.route.updateMany({
    where: { createdById: null },
    data: { createdById: creatorId },
  });

  console.log(`Se asignó "${user.name}" (${creatorId}) como creador de ${result.count} ruta(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
