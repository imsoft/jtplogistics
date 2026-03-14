/**
 * Crea o actualiza la cuenta demo para transportistas.
 * Ejecutar: pnpm tsx scripts/create-demo-carrier.ts
 */

import "dotenv/config";
import { hashPassword } from "better-auth/crypto";
import { prisma } from "../src/lib/db";

const DEMO_EMAIL = "demo@jtp.com.mx";
const DEMO_PASSWORD = "Demo2026";
const DEMO_NAME = "Demo Transportista";

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  const hashed = await hashPassword(DEMO_PASSWORD);

  if (existing) {
    const account = await prisma.account.findFirst({
      where: { userId: existing.id, providerId: "credential" },
    });
    if (account) {
      await prisma.account.update({
        where: { id: account.id },
        data: { password: hashed, updatedAt: new Date() },
      });
    } else {
      await prisma.account.create({
        data: {
          id: crypto.randomUUID(),
          accountId: DEMO_EMAIL,
          providerId: "credential",
          userId: existing.id,
          password: hashed,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }
    await prisma.user.update({
      where: { id: existing.id },
      data: { name: DEMO_NAME, role: "carrier", updatedAt: new Date() },
    });
    console.log(`✅ Cuenta demo actualizada: ${DEMO_EMAIL}`);
  } else {
    const now = new Date();
    const userId = crypto.randomUUID();
    await prisma.user.create({
      data: {
        id: userId,
        name: DEMO_NAME,
        email: DEMO_EMAIL,
        emailVerified: false,
        role: "carrier",
        createdAt: now,
        updatedAt: now,
      },
    });
    await prisma.account.create({
      data: {
        id: crypto.randomUUID(),
        accountId: DEMO_EMAIL,
        providerId: "credential",
        userId,
        password: hashed,
        createdAt: now,
        updatedAt: now,
      },
    });
    console.log(`✅ Cuenta demo creada: ${DEMO_EMAIL}`);
  }

  console.log(`   Correo: ${DEMO_EMAIL}`);
  console.log(`   Contraseña: ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
