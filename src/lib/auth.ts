/**
 * Better Auth: config with Prisma (PostgreSQL).
 * Tables/columns in DB in snake_case via Prisma @map/@@map.
 * User role: admin | carrier | collaborator (stored in English).
 */

import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { getAuthBaseUrl } from "@/lib/auth-utils";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "collaborator",
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
  trustedOrigins: [getAuthBaseUrl(), "http://localhost:3000"].filter(
    (v, i, a) => a.indexOf(v) === i
  ),
  plugins: [nextCookies()],
});
