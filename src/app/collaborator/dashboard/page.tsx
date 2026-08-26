import Link from "next/link";
import {
  Anchor,
  BarChart3,
  CalendarDays,
  Clock,
  ClipboardList,
  FileText,
  Laptop,
  Lightbulb,
  LifeBuoy,
  PauseCircle,
  Ship,
  Smartphone,
  Truck,
  UserRound,
  Users,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard, fmtInt, fmtMxn } from "@/components/dashboard/home/stat-card";
import { requireCollaboratorPage } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { formatDateRange, entryKindLabel } from "@/lib/mural";
import type { MuralEntryType } from "@prisma/client";

export const metadata = {
  title: "Inicio | JTP Logistics",
  description: "Panel de control del colaborador",
};

// El resumen agrega datos en vivo; no debe cachearse de forma estática.
export const dynamic = "force-dynamic";

const BASE = "/collaborator/dashboard";

/** Evita consultar lo que el colaborador no tiene permitido ver. */
function when<T>(allowed: boolean | undefined, query: () => Promise<T>, fallback: T): Promise<T> {
  return allowed ? query() : Promise.resolve(fallback);
}

export default async function CollaboratorDashboard() {
  const session = await requireCollaboratorPage();
  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      canViewProviders: true,
      canViewQuotes: true,
      canViewClients: true,
      canViewRoutes: true,
      canViewShipments: true,
      canViewFinances: true,
      canViewTasks: true,
      canViewMural: true,
      canViewIdeas: true,
      canViewMaritimeQuotes: true,
      canViewEmployees: true,
      canViewLaptops: true,
      canViewPhones: true,
      canViewMaintenance: true,
      canCreateQuotes: true,
      canCreateClients: true,
    },
  });

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthLabel = new Intl.DateTimeFormat("es-MX", {
    month: "long",
    year: "numeric",
  }).format(now);

  const [
    quotesCount,
    quotesMonth,
    clientsCount,
    routesActive,
    routesPending,
    routesInactive,
    providersCount,
    shipmentsAttention,
    financeMonth,
    openTasks,
    maritimeCount,
    ideasCount,
    employeesCount,
    laptopsCount,
    phonesCount,
    maintenanceUpcoming,
    myTickets,
    muralUpcoming,
  ] = await Promise.all([
    when(user?.canViewQuotes, () => prisma.generatedQuote.count({ where: { createdById: userId } }), 0),
    when(
      user?.canViewQuotes,
      () =>
        prisma.generatedQuote.count({
          where: { createdById: userId, createdAt: { gte: startOfMonth } },
        }),
      0
    ),
    when(user?.canViewClients, () => prisma.client.count(), 0),
    when(user?.canViewRoutes, () => prisma.route.count({ where: { status: "active" } }), 0),
    when(user?.canViewRoutes, () => prisma.route.count({ where: { status: "pending" } }), 0),
    when(user?.canViewRoutes, () => prisma.route.count({ where: { status: "inactive" } }), 0),
    when(user?.canViewProviders, () => prisma.user.count({ where: { role: "carrier" } }), 0),
    when(
      user?.canViewShipments,
      () =>
        prisma.shipment.count({
          where: { status: { in: ["pending", "at_risk", "not_delivered"] } },
        }),
      0
    ),
    when(
      user?.canViewFinances,
      () =>
        prisma.finance.aggregate({
          _sum: { sale: true, cost: true },
          _count: { _all: true },
          where: { createdAt: { gte: startOfMonth } },
        }),
      null as { _sum: { sale: number | null; cost: number | null }; _count: { _all: number } } | null
    ),
    when(
      user?.canViewTasks,
      () =>
        prisma.task.count({
          where: { assigneeId: userId, status: { in: ["pending", "in_progress"] } },
        }),
      0
    ),
    when(user?.canViewMaritimeQuotes, () => prisma.maritimeQuote.count(), 0),
    when(user?.canViewIdeas, () => prisma.idea.count({ where: { status: "pending" } }), 0),
    when(user?.canViewEmployees, () => prisma.user.count({ where: { role: "collaborator" } }), 0),
    when(user?.canViewLaptops, () => prisma.laptop.count(), 0),
    when(user?.canViewPhones, () => prisma.phone.count(), 0),
    when(
      user?.canViewMaintenance,
      () =>
        prisma.maintenance.count({
          where: { status: "scheduled", scheduledFor: { gte: startOfToday } },
        }),
      0
    ),
    prisma.supportTicket.count({
      where: { reporterId: userId, status: { in: ["open", "in_progress"] } },
    }),
    when(
      user?.canViewMural,
      () =>
        prisma.muralEntry.findMany({
          where: { startDate: { gte: startOfToday } },
          orderBy: { startDate: "asc" },
          take: 4,
          select: {
            id: true,
            type: true,
            title: true,
            startDate: true,
            endDate: true,
            subject: { select: { name: true } },
          },
        }),
      [] as {
        id: string;
        type: MuralEntryType;
        title: string;
        startDate: Date;
        endDate: Date | null;
        subject: { name: string } | null;
      }[]
    ),
  ]);

  const monthSale = financeMonth?._sum.sale ?? 0;
  const monthCost = financeMonth?._sum.cost ?? 0;
  const monthMargin = monthSale - monthCost;

  return (
    <div className="min-w-0 space-y-6">
      <div className="min-w-0">
        <h1 className="page-heading">Bienvenido, {user?.name}</h1>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
          Panel de control • <span className="text-email">{user?.email}</span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {user?.canViewQuotes && (
          <StatCard
            label="Mis cotizaciones"
            value={fmtInt(quotesCount)}
            hint={`${fmtInt(quotesMonth)} en ${monthLabel}`}
            icon={<FileText className="size-5" />}
            href={quotesCount === 0 ? `${BASE}/quotes/new` : `${BASE}/quotes`}
          />
        )}
        {user?.canViewClients && (
          <StatCard
            label="Clientes"
            value={fmtInt(clientsCount)}
            hint="registrados"
            icon={<Users className="size-5" />}
            href={`${BASE}/clients`}
          />
        )}
        {user?.canViewRoutes && (
          <>
            <StatCard
              label="Rutas activas"
              value={fmtInt(routesActive)}
              hint="en operación"
              icon={<BarChart3 className="size-5" />}
              href={`${BASE}/routes?status=active`}
            />
            <StatCard
              label="Rutas pendientes"
              value={fmtInt(routesPending)}
              hint="esperando activación"
              icon={<Clock className="size-5" />}
              href={`${BASE}/routes?status=pending`}
              accent={routesPending > 0}
            />
            <StatCard
              label="Rutas inactivas"
              value={fmtInt(routesInactive)}
              hint="fuera de operación"
              icon={<PauseCircle className="size-5" />}
              href={`${BASE}/routes?status=inactive`}
            />
          </>
        )}
        {user?.canViewProviders && (
          <StatCard
            label="Proveedores"
            value={fmtInt(providersCount)}
            hint="disponibles"
            icon={<Truck className="size-5" />}
            href={`${BASE}/providers`}
          />
        )}
        {user?.canViewShipments && (
          <StatCard
            label="Embarques por atender"
            value={fmtInt(shipmentsAttention)}
            hint="pendientes, en riesgo o no entregados"
            icon={<Ship className="size-5" />}
            href={`${BASE}/shipments`}
            accent={shipmentsAttention > 0}
          />
        )}
        {user?.canViewMaritimeQuotes && (
          <StatCard
            label="Cotizaciones marítimas"
            value={fmtInt(maritimeCount)}
            hint="registradas"
            icon={<Anchor className="size-5" />}
            href={`${BASE}/maritime-quotes`}
          />
        )}
        {user?.canViewTasks && (
          <StatCard
            label="Mis tareas"
            value={fmtInt(openTasks)}
            hint="pendientes o en curso"
            icon={<ClipboardList className="size-5" />}
            href={`${BASE}/tasks`}
            accent={openTasks > 0}
          />
        )}
        {user?.canViewIdeas && (
          <StatCard
            label="Ideas por revisar"
            value={fmtInt(ideasCount)}
            hint="del buzón del equipo"
            icon={<Lightbulb className="size-5" />}
            href={`${BASE}/ideas`}
          />
        )}
        {user?.canViewEmployees && (
          <StatCard
            label="Colaboradores"
            value={fmtInt(employeesCount)}
            hint="en el directorio"
            icon={<UserRound className="size-5" />}
            href={`${BASE}/employees`}
          />
        )}
        {user?.canViewLaptops && (
          <StatCard
            label="Laptops"
            value={fmtInt(laptopsCount)}
            hint="dadas de alta"
            icon={<Laptop className="size-5" />}
            href={`${BASE}/laptops`}
          />
        )}
        {user?.canViewPhones && (
          <StatCard
            label="Celulares"
            value={fmtInt(phonesCount)}
            hint="dados de alta"
            icon={<Smartphone className="size-5" />}
            href={`${BASE}/phones`}
          />
        )}
        {user?.canViewMaintenance && (
          <StatCard
            label="Mantenimientos"
            value={fmtInt(maintenanceUpcoming)}
            hint="programados"
            icon={<Wrench className="size-5" />}
            href={`${BASE}/maintenance`}
          />
        )}
        <StatCard
          label="Mis reportes de equipo"
          value={fmtInt(myTickets)}
          hint="sin resolver"
          icon={<LifeBuoy className="size-5" />}
          href={`${BASE}/support`}
          accent={myTickets > 0}
        />
      </div>

      {user?.canViewFinances && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Finanzas de {monthLabel}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Venta
                </p>
                <p className="mt-1 text-2xl font-bold tracking-tight">{fmtMxn(monthSale)}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Costo
                </p>
                <p className="mt-1 text-2xl font-bold tracking-tight">{fmtMxn(monthCost)}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Margen
                </p>
                <p
                  className={`mt-1 text-2xl font-bold tracking-tight ${
                    monthMargin >= 0 ? "text-emerald-600" : "text-destructive"
                  }`}
                >
                  {fmtMxn(monthMargin)}
                </p>
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              {fmtInt(financeMonth?._count._all ?? 0)} registro
              {(financeMonth?._count._all ?? 0) === 1 ? "" : "s"} este mes.{" "}
              <Link href={`${BASE}/finances`} className="font-medium text-primary hover:underline">
                Ver finanzas
              </Link>
            </p>
          </CardContent>
        </Card>
      )}

      {user?.canViewMural && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Próximo en el mural
            </CardTitle>
            <CalendarDays className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {muralUpcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay nada agendado por ahora.{" "}
                <Link href={`${BASE}/mural`} className="font-medium text-primary hover:underline">
                  Ir al mural
                </Link>
              </p>
            ) : (
              <ul className="divide-y">
                {muralUpcoming.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {entry.subject?.name ?? entry.title}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {entryKindLabel(entry.type)}
                        {entry.subject ? ` · ${entry.title}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDateRange(entry.startDate, entry.endDate)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Acciones rápidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {user?.canCreateQuotes && (
              <Button asChild variant="outline" className="justify-start">
                <Link href={`${BASE}/quotes/new`}>Crear cotización</Link>
              </Button>
            )}
            {user?.canCreateClients && (
              <Button asChild variant="outline" className="justify-start">
                <Link href={`${BASE}/clients/new`}>Nuevo cliente</Link>
              </Button>
            )}
            {user?.canViewMural && (
              <Button asChild variant="outline" className="justify-start">
                <Link href={`${BASE}/mural`}>Ver el mural</Link>
              </Button>
            )}
            <Button asChild variant="outline" className="justify-start">
              <Link href={`${BASE}/support`}>Reportar un problema</Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href={`${BASE}/profile`}>Mi perfil</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
