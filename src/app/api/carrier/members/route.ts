import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit-log";
import { sendEmail } from "@/lib/email";
import { appUrl } from "@/lib/email-layout";
import { createAuthUser } from "@/lib/create-auth-user";
import { buildCarrierMemberInviteEmail } from "@/lib/account-email";
import { applyPasswordReset, generatePassword } from "@/lib/password-reset";
import { requireCarrierAccount } from "@/lib/carrier-account";
import { CARRIER_MEMBER_PERMISSIONS, pickMemberPermissions } from "@/lib/carrier-permissions";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

/**
 * GET /api/carrier/members — los usuarios de la empresa. Solo el principal:
 * administrar usuarios no se delega.
 */
export async function GET() {
  try {
    const { carrierId } = await requireCarrierAccount("manageUsers");
    const members = await prisma.user.findMany({
      where: { parentCarrierId: carrierId },
      orderBy: [{ memberRevokedAt: { sort: "asc", nulls: "first" } }, { name: "asc" }],
      select: MEMBER_ROW_SELECT,
    });
    return Response.json({ members });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[carrier/members] GET", e);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

/**
 * POST /api/carrier/members
 * body: { name, email, memberCan…: boolean }
 *
 * Da de alta a un usuario de la empresa con una contraseña temporal que le
 * llega por correo. Si ese correo fue de un usuario de esta misma empresa al
 * que se le quitó el acceso, se le devuelve en vez de chocar con el correo
 * ocupado: sus mensajes viejos siguen siendo suyos.
 */
export async function POST(request: Request) {
  try {
    const { carrierId, userId, session } = await requireCarrierAccount("manageUsers");
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email =
      typeof body.email === "string" ? body.email.trim().toLocaleLowerCase("es-MX") : "";
    const permissions = pickMemberPermissions(body);

    if (!name) return Response.json({ error: "Escribe el nombre." }, { status: 400 });
    if (!EMAIL_RE.test(email)) {
      return Response.json({ error: "Escribe un correo válido." }, { status: 400 });
    }

    const company = await prisma.user.findUnique({
      where: { id: carrierId },
      select: { name: true },
    });
    const password = generatePassword();

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true, parentCarrierId: true, memberRevokedAt: true },
    });

    let memberId: string;
    if (existing) {
      const isOurRevoked = existing.parentCarrierId === carrierId && existing.memberRevokedAt;
      if (!isOurRevoked) {
        return Response.json(
          { error: "Ese correo ya tiene una cuenta en JTP Logistics." },
          { status: 409 }
        );
      }
      await prisma.user.update({
        where: { id: existing.id },
        data: { name, memberRevokedAt: null, ...permissions },
      });
      // Crea de nuevo la credencial que se borró al quitarle el acceso.
      await applyPasswordReset(existing.id, email, password);
      memberId = existing.id;
    } else {
      const created = await createAuthUser({ name, email, password });
      // createAuthUser deja el rol por defecto de la tabla, que es el del
      // personal interno: hay que fijarlo a transportista de inmediato.
      await prisma.user.update({
        where: { id: created.id },
        data: { role: "carrier", parentCarrierId: carrierId, ...permissions },
      });
      memberId = created.id;
    }

    let emailed = false;
    let emailError: string | null = null;
    try {
      const built = buildCarrierMemberInviteEmail({
        name,
        companyName: company?.name ?? "tu empresa",
        inviterName: session.user.name,
        email,
        password,
        loginUrl: `${appUrl()}/login`,
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
      userId,
      userName: session.user.name,
      changes: [{ field: "permissions", label: "Permisos", from: null, to: granted.join(", ") || "Ninguno" }],
    });

    return Response.json(
      {
        id: memberId,
        emailed,
        emailError,
        // Solo si el correo no salió: ya tiene cuenta y sin esto quedaría fuera.
        password: emailed ? null : password,
      },
      { status: 201 }
    );
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[carrier/members] POST", e);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
