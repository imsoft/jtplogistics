import { requireAdmin, requireCollaboratorOrAdmin } from "@/lib/auth-server";

/**
 * Wraps an admin API route handler with auth check and error handling.
 * Calls requireAdmin() before running fn(); re-throws Response errors (401/403).
 */
export function adminHandler(fn: () => Promise<Response>): Promise<Response> {
  return (async () => {
    try {
      await requireAdmin();
      return await fn();
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
