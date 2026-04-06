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
      void sendEmail({
        to: user.email,
        subject: "Restablecer contraseña - JTP Logistics",
        text: `Hola ${user.name},\n\nPara restablecer tu contraseña, haz clic en el siguiente enlace:\n\n${url}\n\nEste enlace expira en 1 hora. Si no solicitaste este cambio, ignora este correo.\n\n— JTP Logistics`,
      });
    },
  },
  session: {
    cookieCache: { enabled: true },
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
