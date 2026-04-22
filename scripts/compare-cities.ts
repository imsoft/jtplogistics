import "dotenv/config";
import prisma from "../src/lib/db";
import { MEXICO_STATES_CITIES } from "../src/lib/data/mexico-cities";

function normalize(s: string) {
  return s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

async function main() {
  // Catálogo: mapa de nombre-normalizado → nombre canónico
  const canonical = new Map<string, string>();
  for (const state of MEXICO_STATES_CITIES) {
    for (const city of state.items) {
      canonical.set(normalize(city), city);
    }
  }

  // Ciudades únicas en la BD
  const routes = await prisma.route.findMany({
    select: { origin: true, destination: true },
  });

  const dbCities = new Set<string>();
  for (const r of routes) {
    dbCities.add(r.origin.trim());
    dbCities.add(r.destination.trim());
  }

  const mismatches: { db: string; correct: string }[] = [];
  const notFound: string[] = [];

  for (const city of [...dbCities].sort()) {
    const key = normalize(city);
    const match = canonical.get(key);

    if (match && match !== city) {
      mismatches.push({ db: city, correct: match });
    } else if (!match) {
      notFound.push(city);
    }
  }

  console.log("\n=== NOMBRES CON DIFERENCIAS (BD → Catálogo) ===\n");
  if (mismatches.length === 0) {
    console.log("✅ Sin discrepancias.\n");
  } else {
    for (const m of mismatches) {
      console.log(`  "${m.db}"  →  "${m.correct}"`);
    }
  }

  console.log(`\n=== SIN EQUIVALENTE EN CATÁLOGO (${notFound.length}) ===\n`);
  for (const c of notFound) {
    console.log(`  "${c}"`);
  }
}

main().finally(() => prisma.$disconnect());
