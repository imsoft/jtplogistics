/**
 * Creates a Better Auth user + credential account directly via Prisma,
 * without calling auth.api.signUpEmail which would replace the current session.
 */

import { hashPassword } from "better-auth/crypto";
import { prisma } from "@/lib/db";

/** Error con un mensaje pensado para mostrarse a quien da de alta al usuario. */
export class CreateUserError extends Error {}

/** El mensaje que se puede mostrar: el nuestro, o uno genérico (nunca el de la BD). */
export function createUserErrorMessage(e: unknown): string {
  if (e instanceof CreateUserError) return e.message;
  console.error("[createAuthUser]", e);
  return "No se pudo crear el usuario.";
}

export async function createAuthUser({
  name,
  email,
  password,
}: {
  name: string;
  email: string;
  password: string;
}): Promise<{ id: string }> {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new CreateUserError("El correo ya está registrado");
  }

  const now = new Date();
  const userId = crypto.randomUUID();
  const hashed = await hashPassword(password);

  await prisma.user.create({
    data: {
      id: userId,
      name,
      email,
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
    },
  });

  await prisma.account.create({
    data: {
      id: crypto.randomUUID(),
      // Better Auth busca la credencial por accountId === id del usuario (desde
      // la 1.7 es obligatorio). Antes iba el correo, y al actualizar nadie pudo entrar.
      accountId: userId,
      providerId: "credential",
      userId,
      password: hashed,
      createdAt: now,
      updatedAt: now,
    },
  });

  return { id: userId };
}
