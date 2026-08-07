/**
 * Better Auth: config with Prisma (PostgreSQL).
 * Tables/columns in DB in snake_case via Prisma @map/@@map.
 * User role: admin | carrier | collaborator (stored in English).
 */

import { betterAuth, APIError } from "better-auth";
import { createAuthMiddleware } from "@better-auth/core/api";
import { nextCookies } from "better-auth/next-js";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { buildPasswordResetEmail } from "@/lib/account-email";
import { getAuthBaseUrl, getTrustedOrigins } from "@/lib/auth-utils";
import { validateSignUpEmailPayload } from "@/lib/validators/registration-abuse";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "carrier",
        input: false,
        fieldName: "role",
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      const { subject, html, text } = buildPasswordResetEmail({
        name: user.name,
        url,
      });
      void sendEmail({ to: user.email, subject, html, text });
    },
  },
  session: {
    cookieCache: { enabled: true, maxAge: 5 * 60 },
    // Sin esto se queda con el default de la librería. Explícito: la sesión
    // caduca a los 7 días y se renueva si hay actividad después de 1 día.
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  /**
   * Rate limiting con respaldo en la base de datos.
   *
   * El limitador en memoria (middleware.ts) no basta en Vercel: cada instancia
   * serverless tiene su propio contador, así que el límite real se multiplica
   * por el número de instancias y se reinicia en cada arranque en frío.
   * Guardarlo en la BD hace que el conteo sea el mismo para todas.
   */
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 10 },
      "/sign-up/email": { window: 60, max: 5 },
      "/forget-password": { window: 60, max: 5 },
      "/reset-password": { window: 60, max: 5 },
    },
  },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: getAuthBaseUrl(),
  basePath: "/api/auth",
  trustedOrigins: getTrustedOrigins(),
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email") return;
      const body = ctx.body as { name?: string; email?: string } | undefined;
      const name = typeof body?.name === "string" ? body.name : "";
      const email = typeof body?.email === "string" ? body.email : "";
      const check = validateSignUpEmailPayload({ name, email });
      if (!check.ok) {
        throw new APIError("BAD_REQUEST", { message: check.message });
      }
    }),
  },
  plugins: [nextCookies()],
});
