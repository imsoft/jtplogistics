import { prisma } from "@/lib/db";
import { adminOrDeveloperHandler } from "@/lib/api-handler";
import {
  MIN_PASSWORD_LENGTH,
  applyPasswordReset,
  generatePassword,
} from "@/lib/password-reset";
import { logAudit } from "@/lib/audit-log";
import { sendEmail } from "@/lib/email";
import { buildPasswordResetByStaffEmail } from "@/lib/account-email";
import { appUrl } from "@/lib/email-layout";

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
      // En mayúsculas porque el correo de aviso también lo va: si se guardara
      // en minúsculas, la que le llega al colaborador no le serviría.
      password = body.password.trim().toLocaleUpperCase("es-MX");
      if (password.length < MIN_PASSWORD_LENGTH) {
        return Response.json(
          { error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.` },
          { status: 400 }
        );
      }
    } else {
      password = generatePassword();
    }

    const { closedSessions } = await applyPasswordReset(id, target.email, password);

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
