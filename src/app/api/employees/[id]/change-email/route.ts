import { prisma } from "@/lib/db";
import { adminOrDeveloperHandler } from "@/lib/api-handler";
import { logAudit } from "@/lib/audit-log";

/**
 * El acceso a la plataforma solo se da con un buzón administrativo del
 * catálogo de Correos: son los de la empresa (@jtp.com.mx y Qweb360), no los
 * personales de Gmail o Hotmail que también se guardan ahí.
 */
const LOGIN_ACCOUNT_TYPE = "administrative";

/**
 * GET /api/employees/[id]/change-email
 *
 * Los correos administrativos que se le pueden poner, con la nota de a quién
 * pertenece cada uno si ya está tomado. La lista completa se manda igual: se
 * enseñan deshabilitados para que se vea que existen y por qué no se pueden
 * elegir, en vez de que parezca que faltan del catálogo.
 */
export function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return adminOrDeveloperHandler(async () => {
    const { id } = await params;

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true },
    });
    if (!target || target.role !== "collaborator") {
      return Response.json({ error: "No encontrado" }, { status: 404 });
    }

    const accounts = await prisma.emailAccount.findMany({
      where: { type: LOGIN_ACCOUNT_TYPE },
      select: { id: true, email: true },
      orderBy: { email: "asc" },
    });

    // Un solo viaje para saber cuáles ya son el acceso de alguien más.
    const owners = await prisma.user.findMany({
      where: { email: { in: accounts.map((a) => a.email.toLocaleLowerCase("es-MX")) } },
      select: { id: true, name: true, email: true },
    });
    const ownerByEmail = new Map(owners.map((o) => [o.email.toLocaleLowerCase("es-MX"), o]));

    const currentEmail = target.email.toLocaleLowerCase("es-MX");

    return Response.json({
      currentEmail,
      accounts: accounts.map((a) => {
        const email = a.email.toLocaleLowerCase("es-MX");
        const owner = ownerByEmail.get(email);
        return {
          id: a.id,
          email,
          isCurrent: email === currentEmail,
          takenBy: owner && owner.id !== id ? owner.name : null,
        };
      }),
    });
  });
}

/**
 * POST /api/employees/[id]/change-email
 * body: { email: string }
 *
 * Cambia el correo con el que el colaborador inicia sesión. Son dos renglones
 * en la base, no uno: `users.email` y el `accounts.account_id` de la cuenta de
 * credenciales que escribe create-auth-user. Si solo se moviera uno, la cuenta
 * quedaría descuadrada, así que se actualizan juntos en una transacción.
 *
 * La contraseña no se toca: entra con la misma, nada más cambia el correo.
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

    const body = (await request.json().catch(() => ({}))) as { email?: unknown };
    const email =
      typeof body.email === "string" ? body.email.trim().toLocaleLowerCase("es-MX") : "";

    if (!email) {
      return Response.json({ error: "Elige un correo administrativo." }, { status: 400 });
    }

    // No basta con que el select solo muestre administrativos: quien pegue
    // otro correo contra la API se toparía con esto igual.
    const account = await prisma.emailAccount.findFirst({
      where: { type: LOGIN_ACCOUNT_TYPE, email: { equals: email, mode: "insensitive" } },
      select: { id: true },
    });
    if (!account) {
      return Response.json(
        {
          error:
            "Ese correo no está en el catálogo como administrativo. Primero dalo de alta en la sección de Correos.",
        },
        { status: 400 }
      );
    }

    if (email === target.email.toLocaleLowerCase("es-MX")) {
      return Response.json(
        { error: "Ese ya es su correo de acceso: no hay nada que cambiar." },
        { status: 400 }
      );
    }

    // Se revisa antes para poder decir de quién es; el @unique solo truena.
    const taken = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true },
    });
    if (taken) {
      return Response.json(
        { error: `Ese correo ya lo usa ${taken.name} para entrar.` },
        { status: 409 }
      );
    }

    const previousEmail = target.email;
    const now = new Date();

    const closedSessions = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { email, updatedAt: now },
      });

      // create-auth-user guarda el correo también como account_id. Se mueve
      // con el del usuario para que la cuenta de credenciales no se descuadre.
      await tx.account.updateMany({
        where: { userId: id, providerId: "credential" },
        data: { accountId: email, updatedAt: now },
      });

      // Si sigue dentro, su sesión quedaría amarrada a un correo que ya no es
      // el suyo. Se le cierra para que vuelva a entrar con el nuevo.
      const { count } = await tx.session.deleteMany({ where: { userId: id } });
      return count;
    });

    void logAudit({
      resource: "employee",
      resourceId: id,
      resourceLabel: target.name,
      action: "updated",
      userId: session.user.id,
      userName: session.user.name,
      changes: [
        { field: "email", label: "Correo de acceso", from: previousEmail, to: email },
      ],
    });

    return Response.json({ email, previousEmail, closedSessions });
  });
}
