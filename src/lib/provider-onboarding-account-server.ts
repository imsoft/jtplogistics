/**
 * Crea (o liga) la cuenta del proveedor cuando su alta queda completa. Se
 * llama después de guardar el alta, al crear y al editar.
 */

import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit-log";
import { sendEmail } from "@/lib/email";
import { appUrl } from "@/lib/email-layout";
import { buildProviderWelcomeEmail } from "@/lib/account-email";
import { CreateUserError, createAuthUser } from "@/lib/create-auth-user";
import { ONBOARDING_DOCS, type DocRecord } from "@/lib/provider-onboardings";
import { shouldCreateProviderAccount } from "@/lib/provider-onboarding-account";

export type ProviderAccountResult =
  | { status: "none" }
  | { status: "created"; userId: string; emailed: boolean; message: string }
  | { status: "linked"; userId: string; message: string }
  | { status: "skipped"; message: string };

/**
 * Nunca truena: el alta ya se guardó y un fallo aquí no debe parecer que no.
 * Guardar de nuevo vuelve a intentarlo.
 */
export async function ensureProviderAccount(
  onboardingId: string,
  actor: { id: string; name: string }
): Promise<ProviderAccountResult> {
  try {
    return await createOrLinkAccount(onboardingId, actor);
  } catch (e) {
    console.error("[provider-onboarding-account]", e);
    return { status: "skipped", message: "El alta se guardó, pero no se pudo crear la cuenta del proveedor. Vuelve a guardar para reintentar." };
  }
}

async function createOrLinkAccount(
  onboardingId: string,
  actor: { id: string; name: string }
): Promise<ProviderAccountResult> {
  const row = await prisma.providerOnboarding.findUnique({ where: { id: onboardingId } });
  if (!row) return { status: "none" };
  const docs = Object.fromEntries(ONBOARDING_DOCS.map((d) => [d.key, row[d.key]])) as DocRecord;
  if (!shouldCreateProviderAccount({ docs, email: row.email, rfc: row.rfc, userId: row.userId })) {
    return { status: "none" };
  }
  const email = row.email!;
  const rfc = row.rfc!;
  const name = row.commercialName || row.legalName;

  const audit = (userId: string, to: string) =>
    logAudit({
      resource: "provider_onboarding",
      resourceId: row.id,
      resourceLabel: row.legalName,
      action: "updated",
      userId: actor.id,
      userName: actor.name,
      changes: [{ field: "userId", label: "Cuenta del proveedor", from: null, to: `${to} (${userId})` }],
    });

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, parentCarrierId: true, providerOnboarding: { select: { id: true } } },
  });
  if (existing) {
    // Solo se liga a un proveedor principal que no tenga ya otra alta.
    const linkable = existing.role === "carrier" && !existing.parentCarrierId && !existing.providerOnboarding;
    if (!linkable) {
      return {
        status: "skipped",
        message: `No se creó la cuenta del proveedor: el correo ${email} ya es de otro usuario de la plataforma.`,
      };
    }
    const { count } = await prisma.providerOnboarding.updateMany({
      where: { id: row.id, userId: null },
      data: { userId: existing.id },
    });
    if (count === 0) return { status: "none" };
    await audit(existing.id, "ligada a la cuenta que ya existía");
    return { status: "linked", userId: existing.id, message: "El alta quedó ligada a la cuenta que el proveedor ya tenía." };
  }

  let userId: string;
  try {
    const created = await createAuthUser({
      name,
      email,
      // Decisión del cliente: la contraseña temporal es el RFC, tal cual se guardó.
      password: rfc,
      extra: { role: "carrier", mustChangePassword: true },
    });
    userId = created.id;
  } catch (e) {
    // Otro guardado al mismo tiempo pudo crearla primero.
    if (e instanceof CreateUserError) {
      return { status: "skipped", message: `No se creó la cuenta del proveedor: el correo ${email} ya está registrado.` };
    }
    throw e;
  }

  // El correo ya lo comprobó JTP con el expediente; el perfil, como en el registro propio.
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { emailVerified: true } }),
    prisma.profile.upsert({
      where: { userId },
      create: { userId, commercialName: row.commercialName, legalName: row.legalName, rfc },
      update: {},
    }),
    prisma.providerOnboarding.update({ where: { id: row.id }, data: { userId } }),
  ]);
  await audit(userId, `creada para ${email}`);

  let emailed = false;
  try {
    const built = buildProviderWelcomeEmail({
      companyName: name,
      email,
      rfc,
      loginUrl: `${appUrl()}/login`,
      manualUrl: `${appUrl()}/manual-proveedor`,
    });
    await sendEmail({ to: email, subject: built.subject, html: built.html || undefined, text: built.text });
    emailed = true;
  } catch (e) {
    console.error("[provider-onboarding-account] correo de bienvenida", e);
  }

  return {
    status: "created",
    userId,
    emailed,
    message: emailed
      ? `Se creó la cuenta del proveedor y se le envió su acceso a ${email}.`
      : `Se creó la cuenta del proveedor, pero no se pudo enviar el correo a ${email}. Su contraseña temporal es su RFC.`,
  };
}
