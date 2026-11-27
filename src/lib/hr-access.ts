/**
 * RH y dirección: evaluaciones de colaboradores y actas administrativas.
 * Entran el admin (dirección) y los colaboradores con permiso de editar
 * colaboradores (RH). Nadie ve ni toca lo suyo: el colaborador no ve sus
 * evaluaciones (decisión del cliente).
 */
import { prisma } from "@/lib/db";
import { requireCollaboratorOrAdmin } from "@/lib/auth-server";

const deny = (msg: string, status = 403) =>
  new Response(JSON.stringify({ error: msg }), { status, headers: { "Content-Type": "application/json" } });

export async function requireHrAccess() {
  const session = await requireCollaboratorOrAdmin();
  if (session.user.role === "admin") return session;
  const me = await prisma.user.findUnique({ where: { id: session.user.id }, select: { canUpdateEmployees: true } });
  if (!me?.canUpdateEmployees) throw deny("Sin permiso");
  return session;
}

/** Igual que requireHrAccess, y además no es su propio expediente. */
export async function requireHrAccessFor(employeeId: string) {
  const session = await requireHrAccess();
  if (session.user.id === employeeId && session.user.role !== "admin") throw deny("No puedes ver tu propio expediente.");
  return session;
}

export async function hrHandler(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[hr]", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
