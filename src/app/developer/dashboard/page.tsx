import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  LifeBuoy,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard, fmtInt } from "@/components/dashboard/home/stat-card";
import { requireDeveloperPage } from "@/lib/auth-server";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "Inicio | JTP Logistics",
  description: "Resumen de mantenimientos, reportes de equipo y tareas.",
};

// El resumen agrega datos en vivo; no debe cachearse de forma estática.
export const dynamic = "force-dynamic";

const dayFmt = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" });

export default async function DeveloperDashboardPage() {
  const session = await requireDeveloperPage();
  const userId = session.user.id;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const inSevenDays = new Date(startOfToday);
  inSevenDays.setDate(inSevenDays.getDate() + 7);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthLabel = new Intl.DateTimeFormat("es-MX", {
    month: "long",
    year: "numeric",
  }).format(now);

  const [
    upcoming,
    overdue,
    doneThisMonth,
    preventiveThisMonth,
    correctiveThisMonth,
    openTickets,
    newTickets,
    openTasks,
    nextMaintenances,
  ] = await Promise.all([
    prisma.maintenance.count({
      where: { status: "scheduled", scheduledFor: { gte: startOfToday, lt: inSevenDays } },
    }),
    prisma.maintenance.count({
      where: { status: "scheduled", scheduledFor: { lt: startOfToday } },
    }),
    prisma.maintenance.count({
      where: { status: "done", performedAt: { gte: startOfMonth } },
    }),
    prisma.maintenance.count({
      where: { kind: "preventive", status: "done", performedAt: { gte: startOfMonth } },
    }),
    prisma.maintenance.count({
      where: { kind: "corrective", status: "done", performedAt: { gte: startOfMonth } },
    }),
    prisma.supportTicket.count({ where: { status: { in: ["open", "in_progress"] } } }),
    prisma.supportTicket.count({ where: { status: "open" } }),
    prisma.task.count({
      where: { assigneeId: userId, status: { in: ["pending", "in_progress"] } },
    }),
    prisma.maintenance.findMany({
      where: { status: "scheduled" },
      orderBy: { scheduledFor: "asc" },
      take: 5,
      select: {
        id: true,
        kind: true,
        description: true,
        scheduledFor: true,
        laptop: { select: { name: true, serialNumber: true } },
        phone: { select: { name: true, serialNumber: true } },
      },
    }),
  ]);

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="page-heading">Bienvenido, {session.user.name}</h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
            Soporte de TI • <span className="text-email">{session.user.email}</span>
          </p>
        </div>
        <Button asChild className="self-start sm:self-auto">
          <Link href="/developer/dashboard/maintenance" className="flex items-center gap-2">
            <Wrench className="size-4" />
            Programar mantenimiento
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Vencidos"
          value={fmtInt(overdue)}
          hint="programados y sin cerrar"
          icon={<AlertTriangle className="size-5" />}
          href="/developer/dashboard/maintenance"
          accent={overdue > 0}
        />
        <StatCard
          label="Próximos 7 días"
          value={fmtInt(upcoming)}
          hint="mantenimientos agendados"
          icon={<CalendarClock className="size-5" />}
          href="/developer/dashboard/maintenance"
        />
        <StatCard
          label="Realizados"
          value={fmtInt(doneThisMonth)}
          hint={monthLabel}
          icon={<CheckCircle2 className="size-5" />}
          href="/developer/dashboard/maintenance"
        />
        <StatCard
          label="Preventivos / correctivos"
          value={`${fmtInt(preventiveThisMonth)} / ${fmtInt(correctiveThisMonth)}`}
          hint={`cerrados en ${monthLabel}`}
          icon={<Wrench className="size-5" />}
          href="/developer/dashboard/maintenance"
        />
        <StatCard
          label="Reportes abiertos"
          value={fmtInt(openTickets)}
          hint={`${fmtInt(newTickets)} sin tomar`}
          icon={<LifeBuoy className="size-5" />}
          href="/developer/dashboard/tickets"
          accent={newTickets > 0}
        />
        <StatCard
          label="Mis tareas"
          value={fmtInt(openTasks)}
          hint="pendientes o en curso"
          icon={<ClipboardList className="size-5" />}
          href="/developer/dashboard/tasks"
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Siguientes mantenimientos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {nextMaintenances.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">No hay mantenimientos programados.</p>
              <Button asChild variant="outline">
                <Link href="/developer/dashboard/maintenance">Programar uno</Link>
              </Button>
            </div>
          ) : (
            <ul className="divide-y">
              {nextMaintenances.map((m) => {
                const equipment = m.laptop ?? m.phone;
                const late = m.scheduledFor < startOfToday;
                return (
                  <li key={m.id} className="py-2 text-sm">
                    <Link
                      href={`/developer/dashboard/maintenance/${m.id}`}
                      className="flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {equipment?.name ?? m.description}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {m.kind === "preventive" ? "Preventivo" : "Correctivo"}
                          {equipment?.serialNumber ? ` · ${equipment.serialNumber}` : ""}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 text-xs font-medium ${
                          late ? "text-destructive" : "text-muted-foreground"
                        }`}
                      >
                        {dayFmt.format(m.scheduledFor)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
