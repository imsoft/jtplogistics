import { prisma } from "@/lib/db";
import { encryptSecret } from "@/lib/secret-vault";
import { EMAIL_ACCOUNT_LIST_INCLUDE, emailAccountToJson } from "@/lib/email-accounts-list";
import { adminHandler } from "@/lib/api-handler";
import { logAudit } from "@/lib/audit-log";

export function GET() {
  return adminHandler(async () => {
    const emails = await prisma.emailAccount.findMany({
      orderBy: { createdAt: "desc" },
      include: EMAIL_ACCOUNT_LIST_INCLUDE,
    });
    return Response.json(emails.map(emailAccountToJson));
  });
}

export function POST(request: Request) {
  return adminHandler(async (session) => {
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
      resource: "email",
      resourceId: account.id,
      resourceLabel: email,
      action: "created",
      userId: session.user.id,
      userName: session.user.name,
    });

    return Response.json({ id: account.id }, { status: 201 });
  });
}
