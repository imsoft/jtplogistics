/**
 * Server-side auth: get session in API routes / server components.
 */

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import type { SessionUser } from "@/lib/auth-utils";

export async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireSession();
  if (session.user.role !== "admin") {
    throw new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return session;
}

export async function requireCarrier() {
  const session = await requireSession();
  if (session.user.role !== "carrier") {
    throw new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return session;
}

export async function requireCollaboratorOrAdmin() {
  const session = await requireSession();
  if (session.user.role !== "collaborator" && session.user.role !== "admin") {
    throw new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return session;
}

/** Redirects to the user's dashboard if they already have an active session. */
export async function redirectIfAuthenticated() {
  const session = await getSession();
  if (!session) return;
  const role = (session.user as SessionUser).role;
  if (role === "admin") redirect("/admin/dashboard");
  else if (role === "carrier") redirect("/carrier/dashboard/routes");
  else if (role === "collaborator") redirect("/collaborator/dashboard");
  else redirect("/login");
}
