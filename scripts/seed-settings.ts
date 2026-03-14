/**
 * Inicializa los ajustes globales de la aplicación en la BD.
 * Uso: pnpm run db:seed-settings
 */
import "dotenv/config";
import { prisma } from "../src/lib/db";

const DEFAULTS: Record<string, string> = {
  jtp_whatsapp: "523315841738",
};

async function main() {
  for (const [key, value] of Object.entries(DEFAULTS)) {
    await prisma.setting.upsert({
      where: { key },
      create: { key, value },
      update: {},
    });
    console.log(`✅ Setting "${key}" = "${value}"`);
  }
  console.log("Listo.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
