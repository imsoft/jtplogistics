/**
 * Inicializa los ajustes globales de la aplicación en la BD.
 * Uso: pnpm run db:seed-settings
 */
import "dotenv/config";
import { prisma } from "../src/lib/db";

const DEFAULTS: Record<string, string> = {
  jtp_whatsapp: "523315841738",

  // Oficina de JTP: Real de Acueducto 335, interior 18, Zapopan.
  // Coordenadas del pin del lugar en Google Maps (el par !3d!4d de la URL),
  // no el centro del mapa, que apunta unos metros al poniente.
  time_clock_office_lat: "20.7114936",
  time_clock_office_lng: "-103.4101132",
  // 150 m cubre el edificio y su acera. Como la oficina es un interior, el GPS
  // adentro se apoya en WiFi y llega con margen de error grande; apretar más
  // el radio solo generaría señalados falsos. La distancia nunca bloquea.
  time_clock_office_radius_m: "150",
  // Arranca sin revisar la conexión: la fase 1 tiene que correr sin juzgar,
  // para juntar el histórico de qué IPs usa la oficina de verdad.
  time_clock_network_mode: "off",
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
