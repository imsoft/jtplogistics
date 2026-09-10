/**
 * Restablecer la contraseña de acceso de una persona.
 *
 * Vive aparte de la ruta porque lo usan dos flujos: el restablecimiento de uno
 * en su ficha y el envío masivo de credenciales.
 *
 * Ojo con lo que NO se puede hacer aquí: leer la contraseña anterior. Better
 * Auth la guarda con hash, que es de una sola vía. Por eso "mandarle a alguien
 * su contraseña" siempre significa asignarle una nueva.
 */

import { hashPassword } from "better-auth/crypto";
import { prisma } from "@/lib/db";
import { encryptSecret } from "@/lib/secret-vault";

export { MIN_PASSWORD_LENGTH, generatePassword } from "@/lib/password-generator";

/**
 * Reescribe el hash de Better Auth y cierra las sesiones abiertas.
 *
 * Cerrarlas es parte del cambio, no un extra: si no, quien esté dentro sigue
 * trabajando con una contraseña que ya no existe.
 */
export async function applyPasswordReset(
  userId: string,
  email: string,
  password: string
): Promise<{ closedSessions: number }> {
  const hashed = await hashPassword(password);
  const now = new Date();

  // La cuenta de credenciales puede no existir si el usuario se dio de alta
  // por otro medio; en ese caso se crea para que pueda entrar con correo.
  const account = await prisma.account.findFirst({
    where: { userId, providerId: "credential" },
    select: { id: true },
  });

  if (account) {
    await prisma.account.update({
      where: { id: account.id },
      data: { password: hashed, updatedAt: now },
    });
  } else {
    await prisma.account.create({
      data: {
        id: crypto.randomUUID(),
        accountId: email,
        providerId: "credential",
        userId,
        password: hashed,
        createdAt: now,
        updatedAt: now,
      },
    });
  }

  // La referencia de la ficha queda al día, para que no muestre una vieja.
  await prisma.employeeProfile.updateMany({
    where: { userId },
    data: { password: encryptSecret(password) },
  });

  const { count } = await prisma.session.deleteMany({ where: { userId } });
  return { closedSessions: count };
}
