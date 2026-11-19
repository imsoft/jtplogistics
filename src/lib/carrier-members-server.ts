/**
 * Usuarios (colaboradores) de un proveedor. Los administra JTP desde su panel
 * (decisión del cliente); el proveedor solo los consulta. Todas las funciones
 * reciben la empresa (`carrierId`, el principal) y quién hace el cambio.
 */
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit-log";
import { sendEmail } from "@/lib/email";
import { appUrl } from "@/lib/email-layout";
import { createAuthUser } from "@/lib/create-auth-user";
import { buildCarrierMemberInviteEmail } from "@/lib/account-email";
import { applyPasswordReset, generatePassword } from "@/lib/password-reset";
import { CARRIER_MEMBER_PERMISSIONS, pickMemberPermissions } from "@/lib/carrier-permissions";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Lo que ve el proveedor si intenta cambiar sus usuarios. */
export const JTP_MANAGES_MEMBERS =
  "Los usuarios de tu empresa los administra JTP. Si necesitas dar de alta, cambiar permisos o quitar a alguien, escríbenos por Mensajes.";

export interface Actor {
  id: string;
  name: string;
}

export const MEMBER_ROW_SELECT = {
  id: true,
  name: true,
  email: true,
  createdAt: true,
  memberRevokedAt: true,
  memberCanViewRates: true,
  memberCanEditRates: true,
  memberCanMessage: true,
  memberCanSuggest: true,
  memberCanEditCompany: true,
} as const;

export function listCarrierMembers(carrierId: string) {
  return prisma.user.findMany({
    where: { parentCarrierId: carrierId },
    orderBy: [{ memberRevokedAt: { sort: "asc", nulls: "first" } }, { name: "asc" }],
    select: MEMBER_ROW_SELECT,
  });
}

/**
 * Da de alta a un usuario de la empresa con una contraseña temporal que le
 * llega por correo. Si ese correo fue de un usuario de esta misma empresa al
 * que se le quitó el acceso, se le devuelve en vez de chocar con el correo
 * ocupado: sus mensajes viejos siguen siendo suyos.
 */
export async function createCarrierMember(carrierId: string, actor: Actor, body: Record<string, unknown>): Promise<Response> {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLocaleLowerCase("es-MX") : "";
  const permissions = pickMemberPermissions(body);

  if (!name) return Response.json({ error: "Escribe el nombre." }, { status: 400 });
  if (!EMAIL_RE.test(email)) return Response.json({ error: "Escribe un correo válido." }, { status: 400 });

  const company = await prisma.user.findUnique({ where: { id: carrierId }, select: { name: true } });
  const password = generatePassword();
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, parentCarrierId: true, memberRevokedAt: true } });

  let memberId: string;
  if (existing) {
    const isOurRevoked = existing.parentCarrierId === carrierId && existing.memberRevokedAt;
    if (!isOurRevoked) return Response.json({ error: "Ese correo ya tiene una cuenta en JTP Logistics." }, { status: 409 });
    await prisma.user.update({ where: { id: existing.id }, data: { name, memberRevokedAt: null, ...permissions } });
    // Crea de nuevo la credencial que se borró al quitarle el acceso.
    await applyPasswordReset(existing.id, email, password);
    memberId = existing.id;
  } else {
    // Nace ya como usuario de la empresa: el rol por defecto de la tabla es
    // el del personal interno y no debe existir ni un instante con él.
    const created = await createAuthUser({
      name,
      email,
      password,
      extra: { role: "carrier", parentCarrierId: carrierId, ...permissions },
    });
    memberId = created.id;
  }

  let emailed = false;
  let emailError: string | null = null;
  try {
    const built = buildCarrierMemberInviteEmail({
      name,
      companyName: company?.name ?? "tu empresa",
      inviterName: actor.name,
      email,
      password,
      loginUrl: `${appUrl()}/login`,
      manualUrl: `${appUrl()}/manual-proveedor`,
    });
    await sendEmail({ to: email, subject: built.subject, html: built.html || undefined, text: built.text });
    emailed = true;
  } catch (e) {
    emailError = e instanceof Error ? e.message : "No se pudo enviar el correo.";
  }

  const granted = CARRIER_MEMBER_PERMISSIONS.filter((p) => permissions[p.key]).map((p) => p.label);
  void logAudit({
    resource: "carrier_member",
    resourceId: memberId,
    resourceLabel: `${name} (${company?.name ?? carrierId})`,
    action: "created",
    userId: actor.id,
    userName: actor.name,
    changes: [{ field: "permissions", label: "Permisos", from: null, to: granted.join(", ") || "Ninguno" }],
  });

  // La contraseña solo regresa si el correo no salió: ya tiene cuenta y sin esto quedaría fuera.
  return Response.json({ id: memberId, emailed, emailError, password: emailed ? null : password }, { status: 201 });
}

/** El usuario, solo si es de esa empresa. */
function loadMember(carrierId: string, id: string) {
  return prisma.user.findFirst({ where: { id, parentCarrierId: carrierId }, select: { id: true, name: true, memberRevokedAt: true } });
}

/** Cambia los permisos de un usuario de la empresa. */
export async function updateCarrierMember(carrierId: string, id: string, actor: Actor, body: Record<string, unknown>): Promise<Response> {
  const member = await loadMember(carrierId, id);
  if (!member) return Response.json({ error: "No encontrado" }, { status: 404 });
  if (member.memberRevokedAt) {
    return Response.json({ error: "Ese usuario ya no tiene acceso. Vuelve a darlo de alta para devolvérselo." }, { status: 409 });
  }
  const permissions = pickMemberPermissions(body);
  await prisma.user.update({ where: { id }, data: permissions });

  const changed = CARRIER_MEMBER_PERMISSIONS.filter((p) => p.key in permissions).map((p) => `${p.label}: ${permissions[p.key] ? "sí" : "no"}`);
  void logAudit({
    resource: "carrier_member",
    resourceId: id,
    resourceLabel: member.name,
    action: "updated",
    userId: actor.id,
    userName: actor.name,
    changes: [{ field: "permissions", label: "Permisos", from: null, to: changed.join(", ") }],
  });
  return Response.json({ ok: true });
}

/**
 * Le quita el acceso. No borra al usuario: sus mensajes a JTP se borrarían en
 * cascada y la conversación de la empresa perdería registro. Se le borran la
 * contraseña y las sesiones, que es lo que de verdad lo deja fuera.
 */
export async function revokeCarrierMember(carrierId: string, id: string, actor: Actor): Promise<Response> {
  const member = await loadMember(carrierId, id);
  if (!member) return Response.json({ error: "No encontrado" }, { status: 404 });

  await prisma.$transaction([
    // Los permisos también se apagan: si de algún modo volviera a entrar, no podría hacer nada.
    prisma.user.update({
      where: { id },
      data: { memberRevokedAt: new Date(), ...Object.fromEntries(CARRIER_MEMBER_PERMISSIONS.map((p) => [p.key, false])) },
    }),
    prisma.account.deleteMany({ where: { userId: id, providerId: "credential" } }),
    prisma.session.deleteMany({ where: { userId: id } }),
  ]);

  void logAudit({ resource: "carrier_member", resourceId: id, resourceLabel: member.name, action: "deleted", userId: actor.id, userName: actor.name });
  return Response.json({ ok: true });
}
