/**
 * Better Auth client for frontend (React).
 * User role (admin | carrier | collaborator) is included in session.
 */

import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL:
    typeof window !== "undefined"
      ? undefined
      : process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  plugins: [
    inferAdditionalFields({
      user: {
        role: { type: "string", required: true },
      },
    }),
  ],
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  requestPasswordReset,
  resetPassword,
} = authClient;
