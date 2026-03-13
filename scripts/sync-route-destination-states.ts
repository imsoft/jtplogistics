/**
 * Actualiza destinationState de todas las rutas según el destino (ciudad),
 * usando el catálogo de municipios por estado.
 * Uso: pnpm run db:sync-route-destination-states
 */
import "dotenv/config";
import { prisma } from "../src/lib/db";
import { getCityState } from "../src/lib/data/mexico-cities";

async function main() {
  const routes = await prisma.route.findMany({
    select: { id: true, destination: true, destinationState: true },
  });

  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (const route of routes) {
    if (!route.destination?.trim()) {
      skipped++;
      continue;
    }
    const state = getCityState(route.destination.trim());
    if (!state) {
      notFound++;
      console.warn(`Estado no encontrado para destino: "${route.destination}" (ruta ${route.id})`);
      continue;
    }
    if (route.destinationState === state) {
      skipped++;
      continue;
    }
    await prisma.route.update({
      where: { id: route.id },
      data: { destinationState: state },
    });
    updated++;
  }

  console.log(`Listo. Actualizadas: ${updated}, sin cambios: ${skipped}, destino no encontrado: ${notFound}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
