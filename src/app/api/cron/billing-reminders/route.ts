import { prisma } from "@/lib/db";
import { notify } from "@/lib/notify";
import { companyDateKey } from "@/lib/time-clock";
import { dashboardPrefix } from "@/lib/mural-notify";
import { r2 } from "@/lib/billing";
import { buildDigest, digestMessages, isWeekday } from "@/lib/billing-reminders";
import { APPLIED_SELECT, appliedOf } from "@/lib/billing-server";

export const dynamic = "force-dynamic";

/**
 * Recordatorio diario de Administración (lunes a viernes): a dirección y a
 * quien tiene permiso de Administración le llega un aviso con lo vencido o
 * por vencer en cobranza y otro con lo que hay que pagar en la semana.
 *
 * Se protege con CRON_SECRET.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const today = companyDateKey();
    if (!isWeekday(today)) return Response.json({ skipped: "fin de semana" });

    const docs = await prisma.billingDocument.findMany({
      where: { draft: false, cancelledAt: null },
      select: { kind: true, dueDate: true, currency: true, total: true, ...APPLIED_SELECT },
    });
    const digest = buildDigest(
      docs.map((d) => ({
        kind: d.kind,
        dueDate: d.dueDate.toISOString().slice(0, 10),
        currency: d.currency,
        balance: r2(d.total - appliedOf(d).applied),
      })),
      today
    );
    const messages = digestMessages(digest);
    if (messages.length === 0) return Response.json({ notified: 0 });

    const users = await prisma.user.findMany({
      where: {
        offboardedOn: null,
        OR: [{ role: "admin" }, { role: "collaborator", canViewBilling: true }],
      },
      select: { id: true, role: true },
    });
    const slug = { receivable: "receivables", payable: "payables" } as const;
    const inputs = users.flatMap((u) =>
      messages.map((m) => ({
        userId: u.id,
        type: "billing_reminder",
        title: m.title,
        body: m.body,
        href: `${dashboardPrefix(u.role)}/dashboard/billing/${slug[m.kind]}`,
      }))
    );
    await notify(inputs);
    return Response.json({ users: users.length, messages: messages.length, notified: inputs.length });
  } catch (e) {
    console.error("[cron/billing-reminders]", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
