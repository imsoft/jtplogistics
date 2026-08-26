import {
  requireAdmin,
  requireAdminOrDeveloper,
  requireCarrier,
  requireCollaboratorOrAdmin,
} from "@/lib/auth-server";
import { prisma } from "@/lib/db";

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
      if (e instanceof Response) return e;
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
      if (e instanceof Response) return e;
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
      if (e instanceof Response) return e;
      console.error(e);
      return Response.json({ error: "Error interno del servidor" }, { status: 500 });
    }
  })();
}

/**
 * Rutas API que comparten el admin y los colaboradores con cierto permiso de
 * lectura. El admin pasa siempre; al colaborador se le revisa la columna.
 */
export function permissionHandler(
  field: "canViewEmailDemos",
  fn: (session: Awaited<ReturnType<typeof requireCollaboratorOrAdmin>>) => Promise<Response>
): Promise<Response> {
  return (async () => {
    try {
      const session = await requireCollaboratorOrAdmin();
      if (session.user.role === "collaborator") {
        const me = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { [field]: true },
        });
        if (!me || !(me as Record<string, unknown>)[field]) {
          return Response.json({ error: "Sin permiso" }, { status: 403 });
        }
      }
      return await fn(session);
    } catch (e) {
      if (e instanceof Response) return e;
      console.error(e);
      return Response.json({ error: "Error interno del servidor" }, { status: 500 });
    }
  })();
}

/** Rutas API que comparten dirección y soporte de TI. */
export function adminOrDeveloperHandler(
  fn: (session: Awaited<ReturnType<typeof requireAdminOrDeveloper>>) => Promise<Response>
): Promise<Response> {
  return (async () => {
    try {
      const session = await requireAdminOrDeveloper();
      return await fn(session);
    } catch (e) {
      if (e instanceof Response) return e;
      console.error(e);
      return Response.json({ error: "Error interno del servidor" }, { status: 500 });
    }
  })();
}
