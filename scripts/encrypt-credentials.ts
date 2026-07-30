/**
 * Cifra las credenciales de activos que aún están en texto plano.
 *
 * Uso:
 *   pnpm db:encrypt-credentials           → simulación, no escribe nada
 *   pnpm db:encrypt-credentials --apply   → aplica los cambios
 *
 * Requiere CREDENTIALS_ENCRYPTION_KEY. Es idempotente: los valores que ya
 * están cifrados se saltan, así que se puede correr varias veces sin daño.
 */

import "dotenv/config";
import { prisma } from "../src/lib/db";
import {
  encryptSecret,
  decryptSecret,
  isEncrypted,
  hasEncryptionKey,
} from "../src/lib/secret-vault";

const APPLY = process.argv.includes("--apply");

interface Target {
  label: string;
  load: () => Promise<{ id: string; password: string | null }[]>;
  save: (id: string, value: string) => Promise<unknown>;
}

const TARGETS: Target[] = [
  {
    label: "laptops",
    load: () => prisma.laptop.findMany({ select: { id: true, password: true } }),
    save: (id, password) => prisma.laptop.update({ where: { id }, data: { password } }),
  },
  {
    label: "celulares",
    load: () => prisma.phone.findMany({ select: { id: true, password: true } }),
    save: (id, password) => prisma.phone.update({ where: { id }, data: { password } }),
  },
  {
    label: "cuentas de correo",
    load: () => prisma.emailAccount.findMany({ select: { id: true, password: true } }),
    save: (id, password) => prisma.emailAccount.update({ where: { id }, data: { password } }),
  },
  {
    label: "perfiles de colaborador",
    load: async () =>
      (await prisma.employeeProfile.findMany({ select: { userId: true, password: true } })).map(
        (r) => ({ id: r.userId, password: r.password })
      ),
    save: (userId, password) =>
      prisma.employeeProfile.update({ where: { userId }, data: { password } }),
  },
];

async function main() {
  if (!hasEncryptionKey()) {
    console.error(
      [
        "",
        "⛔ Falta CREDENTIALS_ENCRYPTION_KEY.",
        "",
        "   Genera una con:  openssl rand -base64 32",
        "   Guárdala en .env y en las variables de entorno de Vercel.",
        "",
        "   ⚠️  Sin esa llave las credenciales cifradas son irrecuperables:",
        "      respáldala en un gestor de contraseñas antes de continuar.",
        "",
      ].join("\n")
    );
    process.exit(1);
  }

  console.log(APPLY ? "🔐 Cifrando credenciales…\n" : "🔍 Simulación (sin escribir)\n");

  let totalPlain = 0;
  let totalEncrypted = 0;
  let totalEmpty = 0;
  let failures = 0;

  for (const target of TARGETS) {
    const rows = await target.load();
    const plain = rows.filter((r) => r.password && !isEncrypted(r.password));
    const already = rows.filter((r) => r.password && isEncrypted(r.password));
    const empty = rows.filter((r) => !r.password);

    totalEncrypted += already.length;
    totalEmpty += empty.length;

    console.log(
      `${target.label.padEnd(26)} ${String(plain.length).padStart(3)} por cifrar · ` +
        `${already.length} ya cifradas · ${empty.length} sin contraseña`
    );

    if (!APPLY) {
      totalPlain += plain.length;
      continue;
    }

    for (const row of plain) {
      const encrypted = encryptSecret(row.password);
      if (!encrypted) continue;

      // Comprobación antes de escribir: si el ciclo no cierra, no se toca la fila.
      if (decryptSecret(encrypted) !== row.password) {
        console.error(`   ⛔ ${target.label} ${row.id}: el valor no se recupera igual, se omite`);
        failures++;
        continue;
      }

      await target.save(row.id, encrypted);
      totalPlain++;
    }
  }

  console.log("");
  if (APPLY) {
    console.log(`✅ Cifradas ahora:        ${totalPlain}`);
    console.log(`   Ya estaban cifradas:  ${totalEncrypted}`);
    console.log(`   Sin contraseña:       ${totalEmpty}`);
    if (failures > 0) console.log(`   ⛔ Omitidas por error: ${failures}`);
  } else {
    console.log(`Se cifrarían ${totalPlain} credenciales. Corre con --apply para aplicarlo.`);
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("❌ Error:", e);
  await prisma.$disconnect();
  process.exit(1);
});
