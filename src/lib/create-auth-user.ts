/**
 * Creates a Better Auth user + credential account directly via Prisma,
 * without calling auth.api.signUpEmail which would replace the current session.
 */

import { hashPassword } from "better-auth/crypto";
import { prisma } from "@/lib/db";

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
    throw new Error("El correo ya está registrado");
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
      accountId: email,
      providerId: "credential",
      userId,
      password: hashed,
      createdAt: now,
      updatedAt: now,
    },
  });

  return { id: userId };
}
