import { randomBytes } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { prisma } from "@/lib/db";
import { adminOrDeveloperHandler } from "@/lib/api-handler";
import { encryptSecret } from "@/lib/secret-vault";
import { logAudit } from "@/lib/audit-log";
import { sendEmail } from "@/lib/email";
import { buildPasswordResetByStaffEmail } from "@/lib/account-email";
import { appUrl } from "@/lib/email-layout";

/** Mínimo que pide Better Auth para una contraseña. */
const MIN_LENGTH = 8;

/**
 * Genera una contraseña temporal legible: se dicta por teléfono sin confundir
 * mayúsculas con minúsculas ni el 0 con la O.
 */
function generatePassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  const body = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  return `JTP-${body}`;
}

/**
 * POST /api/employees/[id]/reset-password
 * body: { password?: string, notify?: boolean }
 *
 * Restablece de verdad la contraseña de acceso del colaborador: reescribe el
 * hash de Better Auth y cierra sus sesiones abiertas. Distinto del campo
 * "contraseña" de la ficha, que solo guarda una referencia para consulta.
 */
export function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return adminOrDeveloperHandler(async (session) => {
    const { id } = await params;

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true },
    });
    if (!target || target.role !== "collaborator") {
      return Response.json({ error: "No encontrado" }, { status: 404 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      password?: unknown;
      notify?: unknown;
    };

    let password: string;
    if (typeof body.password === "string" && body.password.trim()) {
      password = body.password.trim();
      if (password.length < MIN_LENGTH) {
        return Response.json(
          { error: `La contraseña debe tener al menos ${MIN_LENGTH} caracteres.` },
          { status: 400 }
        );
      }
    } else {
      password = generatePassword();
    }

    const hashed = await hashPassword(password);
    const now = new Date();

    // La cuenta de credenciales puede no existir si el usuario se dio de alta
    // por otro medio; en ese caso se crea para que pueda entrar con correo.
    const account = await prisma.account.findFirst({
      where: { userId: id, providerId: "credential" },
      select: { id: true },
    });

    if (account) {
      await prisma.account.update({
        where: { id: account.id },
        data: { password: hashed, updatedAt: now },
      });
    } else {
      await prisma.account.create({
        data: {
          id: crypto.randomUUID(),
          accountId: target.email,
          providerId: "credential",
          userId: id,
          password: hashed,
          createdAt: now,
          updatedAt: now,
        },
      });
    }

    // La referencia de la ficha queda al día, para que no muestre una vieja.
    await prisma.employeeProfile.updateMany({
      where: { userId: id },
      data: { password: encryptSecret(password) },
    });

    // Quien estuviera dentro con la contraseña anterior queda fuera.
    const { count: closedSessions } = await prisma.session.deleteMany({ where: { userId: id } });

    let emailed = false;
    let emailError: string | null = null;
    if (body.notify === true) {
      try {
        const built = buildPasswordResetByStaffEmail({
          name: target.name,
          password,
          actorName: session.user.name,
          loginUrl: `${appUrl()}/login`,
        });
        await sendEmail({
          to: target.email,
          subject: built.subject,
          html: built.html || undefined,
          text: built.text,
        });
        emailed = true;
      } catch (e) {
        emailError = e instanceof Error ? e.message : "No se pudo enviar el correo.";
      }
    }

    // La contraseña NUNCA se escribe en la bitácora, solo el hecho.
    void logAudit({
      resource: "employee",
      resourceId: id,
      resourceLabel: target.name,
      action: "updated",
      userId: session.user.id,
      userName: session.user.name,
      changes: [{ field: "password", label: "Contraseña", from: null, to: "restablecida" }],
    });

    return Response.json({ password, closedSessions, emailed, emailError });
  });
}
