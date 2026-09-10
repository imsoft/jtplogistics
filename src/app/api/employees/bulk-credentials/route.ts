import { prisma } from "@/lib/db";
import { adminHandler } from "@/lib/api-handler";
import { logAudit } from "@/lib/audit-log";
import { sendEmail } from "@/lib/email";
import { buildPasswordResetByStaffEmail } from "@/lib/account-email";
import { appUrl } from "@/lib/email-layout";
import { applyPasswordReset, generatePassword } from "@/lib/password-reset";

/**
 * A quiénes alcanza el envío masivo.
 *
 * Los transportistas quedan fuera por externos, y dirección por decisión del
 * cliente: se queda con la contraseña que ya tiene. Si algún día hay que
 * cambiársela, es desde su ficha y de una en una, no aquí.
 */
const INTERNAL_ROLES = ["collaborator", "vendor", "developer"] as const;

/**
 * GET /api/employees/bulk-credentials
 *
 * A quiénes se les puede mandar. Quien está ejecutando esto no aparece: darse
 * de baja la propia sesión a media operación deja a medio equipo sin poder
 * entrar y a nadie para arreglarlo.
 */
export function GET() {
  return adminHandler(async (session) => {
    const users = await prisma.user.findMany({
      where: { role: { in: [...INTERNAL_ROLES] }, id: { not: session.user.id } },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        employeeProfile: { select: { position: true } },
      },
    });

    return Response.json({
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        position: u.employeeProfile?.position ?? null,
      })),
    });
  });
}

/**
 * POST /api/employees/bulk-credentials
 * body: { userIds: string[] }
 *
 * Le manda a cada quien su correo de acceso y una contraseña NUEVA.
 *
 * No existe forma de mandarles la que ya tenían: Better Auth las guarda con
 * hash, que es de una sola vía. Cada persona recibe la suya, distinta de la de
 * los demás — una contraseña compartida convertiría los correos, que son
 * adivinables, en la llave de cualquier cuenta.
 *
 * Al restablecerla se cierran las sesiones abiertas: quien esté dentro tendrá
 * que volver a entrar con la nueva.
 */
export function POST(request: Request) {
  return adminHandler(async (session) => {
    const body = (await request.json().catch(() => ({}))) as { userIds?: unknown };
    const ids = Array.isArray(body.userIds)
      ? body.userIds.filter((v): v is string => typeof v === "string")
      : [];

    if (ids.length === 0) {
      return Response.json({ error: "Elige a quién mandarle." }, { status: 400 });
    }

    const users = await prisma.user.findMany({
      where: {
        id: { in: ids, not: session.user.id },
        role: { in: [...INTERNAL_ROLES] },
      },
      select: { id: true, name: true, email: true },
    });

    if (users.length === 0) {
      return Response.json({ error: "Ninguno de esos usuarios aplica." }, { status: 400 });
    }

    const loginUrl = `${appUrl()}/login`;
    const results: {
      id: string;
      name: string;
      email: string;
      sent: boolean;
      /** Solo cuando el correo NO salió: hay que entregarla por otro medio. */
      password: string | null;
      error: string | null;
    }[] = [];

    // Uno por uno y en serie: si el proveedor de correo falla a la mitad, hay
    // que saber exactamente quién sí recibió y quién no.
    for (const user of users) {
      const password = generatePassword();
      try {
        await applyPasswordReset(user.id, user.email, password);
      } catch (e) {
        results.push({
          id: user.id,
          name: user.name,
          email: user.email,
          sent: false,
          password: null,
          error: e instanceof Error ? e.message : "No se pudo cambiar la contraseña.",
        });
        continue;
      }

      try {
        const built = buildPasswordResetByStaffEmail({
          name: user.name,
          password,
          actorName: session.user.name,
          loginUrl,
        });
        await sendEmail({
          to: user.email,
          subject: built.subject,
          html: built.html || undefined,
          text: built.text,
        });
        results.push({
          id: user.id,
          name: user.name,
          email: user.email,
          sent: true,
          password: null,
          error: null,
        });
      } catch (e) {
        // La contraseña YA cambió: sin devolverla, esa persona queda fuera.
        results.push({
          id: user.id,
          name: user.name,
          email: user.email,
          sent: false,
          password,
          error: e instanceof Error ? e.message : "No se pudo enviar el correo.",
        });
      }
    }

    const sent = results.filter((r) => r.sent).length;

    // Las contraseñas NUNCA se escriben en la bitácora, solo el hecho.
    void logAudit({
      resource: "employee",
      resourceId: "bulk",
      resourceLabel: `${results.length} personas`,
      action: "updated",
      userId: session.user.id,
      userName: session.user.name,
      changes: [
        {
          field: "credentials",
          label: "Envío de credenciales",
          from: null,
          to: `${sent} de ${results.length} recibieron su acceso nuevo`,
        },
      ],
    });

    return Response.json({ results, sent, total: results.length });
  });
}
