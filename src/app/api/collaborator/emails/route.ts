import { prisma } from "@/lib/db";
import { encryptSecret } from "@/lib/secret-vault";
import { EMAIL_ACCOUNT_LIST_INCLUDE, emailAccountToJson } from "@/lib/email-accounts-list";
import { requireCollaboratorOrAdmin } from "@/lib/auth-server";
import { logAudit } from "@/lib/audit-log";

export async function GET() {
  try {
    const session = await requireCollaboratorOrAdmin();

    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { canViewEmails: true },
    });

    if (!me?.canViewEmails) {
      return Response.json({ error: "Sin permiso" }, { status: 403 });
    }

    const emails = await prisma.emailAccount.findMany({
      orderBy: { createdAt: "desc" },
      include: EMAIL_ACCOUNT_LIST_INCLUDE,
    });

    return Response.json(emails.map(emailAccountToJson));
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireCollaboratorOrAdmin();

    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { canCreateEmails: true },
    });

    if (!me?.canCreateEmails) {
      return Response.json({ error: "Sin permiso" }, { status: 403 });
    }

    const body = await request.json();
    const { type, email, password, assigneeIds } = body as {
      type: string;
      email: string;
      password?: string;
      assigneeIds?: string[];
    };

    if (!type || !email) {
      return Response.json({ error: "type y email son requeridos" }, { status: 400 });
    }

    const account = await prisma.emailAccount.create({
      data: {
        type,
        email,
        password: encryptSecret(password),
        assignees: assigneeIds?.length
          ? { create: assigneeIds.map((userId) => ({ userId })) }
          : undefined,
      },
    });

    void logAudit({
      resource: "email", resourceId: account.id, resourceLabel: account.email,
      action: "created", userId: session.user.id, userName: session.user.name,
    });

    return Response.json({ id: account.id }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
