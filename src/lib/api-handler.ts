import { requireAdmin, requireCarrier, requireCollaboratorOrAdmin } from "@/lib/auth-server";

export type AdminSession = Awaited<ReturnType<typeof requireAdmin>>;

/**
 * Wraps an admin API route handler with auth check and error handling.
 * Calls requireAdmin() before running fn(); re-throws Response errors (401/403).
 * The session is passed to fn() for audit logging and user context.
 */
export function adminHandler(fn: (session: AdminSession) => Promise<Response>): Promise<Response> {
  return (async () => {
    try {
      const session = await requireAdmin();
      return await fn(session);
    } catch (e) {
      if (e instanceof Response) throw e;
      console.error(e);
      return Response.json({ error: "Error interno del servidor" }, { status: 500 });
    }
  })();
}

/**
 * Wraps an ideas API route handler accessible by collaborators AND admins.
 * Passes the session to fn() so it can use session.user.id.
 */
export function ideasHandler(
  fn: (session: Awaited<ReturnType<typeof requireCollaboratorOrAdmin>>) => Promise<Response>
): Promise<Response> {
  return (async () => {
    try {
      const session = await requireCollaboratorOrAdmin();
      return await fn(session);
    } catch (e) {
      if (e instanceof Response) throw e;
      console.error(e);
      return Response.json({ error: "Error interno del servidor" }, { status: 500 });
    }
  })();
}

/** Rutas API solo para transportistas autenticados. */
export function carrierHandler(
  fn: (session: Awaited<ReturnType<typeof requireCarrier>>) => Promise<Response>
): Promise<Response> {
  return (async () => {
    try {
      const session = await requireCarrier();
      return await fn(session);
    } catch (e) {
      if (e instanceof Response) throw e;
      console.error(e);
      return Response.json({ error: "Error interno del servidor" }, { status: 500 });
    }
  })();
}
