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
    throw new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireSession();
  if (session.user.role !== "admin") {
    throw new Response(JSON.stringify({ error: "Prohibido" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return session;
}

export async function requireCarrier() {
  const session = await requireSession();
  if (session.user.role !== "carrier") {
    throw new Response(JSON.stringify({ error: "Prohibido" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return session;
}

export async function requireCarrierOrVendor() {
  const session = await requireSession();
  if (session.user.role !== "carrier" && session.user.role !== "vendor") {
    throw new Response(JSON.stringify({ error: "Prohibido" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return session;
}

export async function requireCollaboratorOrAdmin() {
  const session = await requireSession();
  if (session.user.role !== "collaborator" && session.user.role !== "admin") {
    throw new Response(JSON.stringify({ error: "Prohibido" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return session;
}

/**
 * Quien puede generar cotizaciones: admin, colaborador y vendedor. Los
 * colaboradores además necesitan el permiso `canCreateQuotes`, que revisa cada
 * endpoint; el vendedor lo tiene por su rol.
 */
export async function requireQuoteAuthor() {
  const session = await requireSession();
  const allowed = ["admin", "collaborator", "vendor"];
  if (!allowed.includes(session.user.role)) {
    throw new Response(JSON.stringify({ error: "Prohibido" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return session;
}

export async function requireVendedor() {
  const session = await requireSession();
  if (session.user.role !== "vendor") {
    throw new Response(JSON.stringify({ error: "Prohibido" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return session;
}

export async function requireDeveloper() {
  const session = await requireSession();
  if (session.user.role !== "developer") {
    throw new Response(JSON.stringify({ error: "Prohibido" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return session;
}

// ── Guardias para SERVER COMPONENTS (páginas y layouts) ──────────────────────
// A diferencia de las versiones para rutas API (que lanzan un Response), estas
// REDIRIGEN. En un server component un `throw new Response()` no lo maneja Next
// y termina mostrando el error boundary ("Algo salió mal") en vez de mandar al
// login —p. ej. al navegar con la sesión ya vencida—. Úsalas en page.tsx/layout.tsx.

export async function requireSessionPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireAdminPage() {
  const session = await requireSessionPage();
  if (session.user.role !== "admin") redirect("/login");
  return session;
}

export async function requireVendedorPage() {
  const session = await requireSessionPage();
  if (session.user.role !== "vendor") redirect("/login");
  return session;
}

/**
 * Panel del colaborador. Se admite también al admin: usa las mismas pantallas
 * cuando entra por un enlace directo.
 */
export async function requireCollaboratorPage() {
  const session = await requireSessionPage();
  const role = session.user.role;
  if (role !== "collaborator" && role !== "admin") redirect("/login");
  return session;
}

/** Panel del transportista. */
export async function requireCarrierPage() {
  const session = await requireSessionPage();
  const role = session.user.role;
  if (role !== "carrier" && role !== "admin") redirect("/login");
  return session;
}

export async function requireDeveloperPage() {
  const session = await requireSessionPage();
  if (session.user.role !== "developer") redirect("/login");
  return session;
}

/** Redirects to the user's dashboard if they already have an active session. */
export async function redirectIfAuthenticated() {
  const session = await getSession();
  if (!session) return;
  const role = (session.user as SessionUser).role;
  if (role === "admin") redirect("/admin/dashboard");
  else if (role === "carrier") redirect("/carrier/dashboard");
  else if (role === "collaborator") redirect("/collaborator/dashboard");
  else if (role === "vendor") redirect("/vendor/dashboard");
  else if (role === "developer") redirect("/developer/dashboard");
  else redirect("/login");
}
