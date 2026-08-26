import Link from "next/link";
import { Calculator, FileText, Handshake, LifeBuoy, MessageCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard, fmtInt } from "@/components/dashboard/home/stat-card";
import { requireVendedorPage } from "@/lib/auth-server";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "Inicio | JTP Logistics",
  description: "Resumen de tus cotizaciones y tu equipo.",
};

// El resumen agrega datos en vivo; no debe cachearse de forma estática.
export const dynamic = "force-dynamic";

const QUOTE_LABELS: Record<string, string> = {
  borrador: "Borrador",
  enviada: "Enviada",
  negociacion: "En negociación",
  aceptada: "Aceptada",
  rechazada: "Rechazada",
};

export default async function VendorDashboardPage() {
  const session = await requireVendedorPage();
  const userId = session.user.id;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthLabel = new Intl.DateTimeFormat("es-MX", {
    month: "long",
    year: "numeric",
  }).format(now);

  const [quotesTotal, quotesMonth, quotesByStatus, collaborators, openTickets, latestQuotes] =
    await Promise.all([
      prisma.generatedQuote.count({ where: { createdById: userId } }),
      prisma.generatedQuote.count({
        where: { createdById: userId, createdAt: { gte: startOfMonth } },
      }),
      prisma.generatedQuote.groupBy({
        by: ["status"],
        _count: { _all: true },
        where: { createdById: userId },
      }),
      prisma.user.count({
        where: { role: "collaborator", employeeProfile: { ownerUserId: userId } },
      }),
      prisma.supportTicket.count({
        where: { reporterId: userId, status: { in: ["open", "in_progress"] } },
      }),
      prisma.generatedQuote.findMany({
        where: { createdById: userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          quoteNumber: true,
          company: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

  const statusCount = (status: string) =>
    quotesByStatus.find((r) => r.status === status)?._count._all ?? 0;

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="page-heading">Bienvenido, {session.user.name}</h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
            Panel de control • <span className="text-email">{session.user.email}</span>
          </p>
        </div>
        <Button asChild className="self-start sm:self-auto">
          <Link href="/vendor/dashboard/quotes" className="flex items-center gap-2">
            <Calculator className="size-4" />
            Cotizar
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Cotizaciones del mes"
          value={fmtInt(quotesMonth)}
          hint={monthLabel}
          icon={<FileText className="size-5" />}
          href="/vendor/dashboard/generated-quotes"
        />
        <StatCard
          label="Cotizaciones en total"
          value={fmtInt(quotesTotal)}
          hint="las que has generado"
          icon={<FileText className="size-5" />}
          href="/vendor/dashboard/generated-quotes"
        />
        <StatCard
          label="En negociación"
          value={fmtInt(statusCount("negociacion"))}
          hint="esperando respuesta"
          icon={<MessageCircle className="size-5" />}
          href="/vendor/dashboard/generated-quotes"
        />
        <StatCard
          label="Aceptadas"
          value={fmtInt(statusCount("aceptada"))}
          hint="cerradas a tu favor"
          icon={<Handshake className="size-5" />}
          href="/vendor/dashboard/generated-quotes"
        />
        <StatCard
          label="Mis colaboradores"
          value={fmtInt(collaborators)}
          hint="registrados por tu equipo"
          icon={<Users className="size-5" />}
          href="/vendor/dashboard/collaborators"
        />
        <StatCard
          label="Reportes de equipo"
          value={fmtInt(openTickets)}
          hint="tuyos, sin resolver"
          icon={<LifeBuoy className="size-5" />}
          href="/vendor/dashboard/support"
          accent={openTickets > 0}
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Últimas cotizaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          {latestQuotes.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Aún no has generado cotizaciones.</p>
              <Button asChild variant="outline">
                <Link href="/vendor/dashboard/quotes">Crear la primera</Link>
              </Button>
            </div>
          ) : (
            <ul className="divide-y">
              {latestQuotes.map((q) => (
                <li key={q.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{q.company}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {q.quoteNumber} ·{" "}
                      {new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(
                        q.createdAt
                      )}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-muted-foreground">
                    {QUOTE_LABELS[q.status] ?? q.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
