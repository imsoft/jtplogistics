import Link from "next/link";
import {
  Route,
  Users,
  Truck,
  Package,
  FileText,
  ListTodo,
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth-server";

export const metadata = {
  title: "Dashboard | JTP Logistics",
  description: "Panel de administración",
};

// El dashboard agrega datos en vivo; no debe cachearse de forma estática.
export const dynamic = "force-dynamic";

const SHIPMENT_LABELS: Record<string, string> = {
  pending: "Pendientes",
  delivered: "Entregados",
  delivered_with_delay: "Con retraso",
  not_delivered: "No entregados",
  at_risk: "En riesgo",
  returned: "Devueltos",
};

const SHIPMENT_ORDER = [
  "pending",
  "at_risk",
  "delivered_with_delay",
  "not_delivered",
  "delivered",
  "returned",
];

function fmtMxn(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

function fmtInt(value: number) {
  return new Intl.NumberFormat("es-MX").format(value);
}

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  href?: string;
  accent?: boolean;
}

function StatCard({ label, value, hint, icon, href, accent }: StatCardProps) {
  const content = (
    <Card
      className={`h-full transition-colors ${
        href ? "hover:border-primary/40" : ""
      } ${accent ? "border-destructive/40" : ""}`}
    >
      <CardContent className="flex items-start justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">
            {label}
          </p>
          <p className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            {value}
          </p>
          {hint && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {hint}
            </p>
          )}
        </div>
        <span
          className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
            accent
              ? "bg-destructive/10 text-destructive"
              : "bg-primary/10 text-primary"
          }`}
        >
          {icon}
        </span>
      </CardContent>
    </Card>
  );

  return href ? (
    <Link href={href} className="block">
      {content}
    </Link>
  ) : (
    content
  );
}

export default async function DashboardPage() {
  await requireAdminPage();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthLabel = new Intl.DateTimeFormat("es-MX", {
    month: "long",
    year: "numeric",
  }).format(now);

  const [
    routesTotal,
    routesActive,
    routesPending,
    routesInactive,
    clientsTotal,
    usersByRole,
    shipmentsByStatus,
    quotesThisMonth,
    openTasks,
    pendingSuggestions,
    financeMonth,
  ] = await Promise.all([
    prisma.route.count(),
    prisma.route.count({ where: { status: "active" } }),
    prisma.route.count({ where: { status: "pending" } }),
    prisma.route.count({ where: { status: "inactive" } }),
    prisma.client.count(),
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
    prisma.shipment.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.generatedQuote.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.task.count({ where: { status: { in: ["pending", "in_progress"] } } }),
    prisma.carrierSuggestion.count({ where: { status: "pending" } }),
    prisma.finance.aggregate({
      _sum: { sale: true, cost: true },
      _count: { _all: true },
      where: { createdAt: { gte: startOfMonth } },
    }),
  ]);

  const roleCount = (role: string) =>
    usersByRole.find((r) => r.role === role)?._count._all ?? 0;
  const carriers = roleCount("carrier");
  const collaborators = roleCount("collaborator");
  const vendors = roleCount("vendor");

  const shipmentCounts: Record<string, number> = {};
  let shipmentsTotal = 0;
  for (const row of shipmentsByStatus) {
    shipmentCounts[row.status] = row._count._all;
    shipmentsTotal += row._count._all;
  }
  const shipmentsAttention =
    (shipmentCounts.pending ?? 0) +
    (shipmentCounts.at_risk ?? 0) +
    (shipmentCounts.not_delivered ?? 0);

  const monthSale = financeMonth._sum.sale ?? 0;
  const monthCost = financeMonth._sum.cost ?? 0;
  const monthMargin = monthSale - monthCost;
  const monthTrips = financeMonth._count._all;

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-heading">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Resumen general de la operación.
          </p>
        </div>
        <Button asChild className="self-start sm:self-auto">
          <Link href="/admin/dashboard/routes" className="flex items-center gap-2">
            <Route className="size-4" />
            Gestionar rutas
          </Link>
        </Button>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Rutas activas"
          value={fmtInt(routesActive)}
          hint={`${fmtInt(routesTotal)} en total`}
          icon={<Route className="size-5" />}
          href="/admin/dashboard/routes?status=active"
        />
        <StatCard
          label="Rutas pendientes"
          value={fmtInt(routesPending)}
          hint="ver con el filtro aplicado"
          icon={<Route className="size-5" />}
          href="/admin/dashboard/routes?status=pending"
          accent={routesPending > 0}
        />
        <StatCard
          label="Rutas inactivas"
          value={fmtInt(routesInactive)}
          hint="ver con el filtro aplicado"
          icon={<Route className="size-5" />}
          href="/admin/dashboard/routes?status=inactive"
          accent={routesInactive > 0}
        />
        <StatCard
          label="Clientes"
          value={fmtInt(clientsTotal)}
          hint="registrados"
          icon={<Users className="size-5" />}
          href="/admin/dashboard/clients"
        />
        <StatCard
          label="Transportistas"
          value={fmtInt(carriers)}
          hint="con acceso al sistema"
          icon={<Truck className="size-5" />}
          href="/admin/dashboard/users"
        />
        <StatCard
          label="Embarques por atender"
          value={fmtInt(shipmentsAttention)}
          hint={`${fmtInt(shipmentsTotal)} en total`}
          icon={<AlertTriangle className="size-5" />}
          href="/admin/dashboard/shipments"
          accent={shipmentsAttention > 0}
        />
        <StatCard
          label="Cotizaciones del mes"
          value={fmtInt(quotesThisMonth)}
          hint={monthLabel}
          icon={<FileText className="size-5" />}
          href="/admin/dashboard/quotes"
        />
        <StatCard
          label="Tareas abiertas"
          value={fmtInt(openTasks)}
          hint="pendientes o en curso"
          icon={<ListTodo className="size-5" />}
          href="/admin/dashboard/tasks"
        />
        <StatCard
          label="Sugerencias"
          value={fmtInt(pendingSuggestions)}
          hint="de transportistas, sin revisar"
          icon={<Lightbulb className="size-5" />}
          href="/admin/dashboard/carrier-suggestions"
          accent={pendingSuggestions > 0}
        />
        <StatCard
          label="Equipo"
          value={fmtInt(collaborators + vendors)}
          hint={`${fmtInt(collaborators)} colaboradores · ${fmtInt(vendors)} proveedores`}
          icon={<Users className="size-5" />}
          href="/admin/dashboard/employees"
        />
      </div>

      {/* Finanzas del mes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Finanzas de {monthLabel}
          </CardTitle>
          {monthMargin >= 0 ? (
            <TrendingUp className="size-4 text-emerald-600" />
          ) : (
            <TrendingDown className="size-4 text-destructive" />
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Venta
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight">
                {fmtMxn(monthSale)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Costo
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight">
                {fmtMxn(monthCost)}
              </p>
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
            {fmtInt(monthTrips)} registro{monthTrips === 1 ? "" : "s"} de finanzas
            este mes.{" "}
            <Link
              href="/admin/dashboard/finances/analytics"
              className="font-medium text-primary hover:underline"
            >
              Ver análisis
            </Link>
          </p>
        </CardContent>
      </Card>

      {/* Embarques por estado */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Embarques por estado
          </CardTitle>
          <Package className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {shipmentsTotal === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no hay embarques registrados.
            </p>
          ) : (
            <div className="space-y-3">
              {SHIPMENT_ORDER.filter((s) => (shipmentCounts[s] ?? 0) > 0).map(
                (status) => {
                  const count = shipmentCounts[status] ?? 0;
                  const pct = Math.round((count / shipmentsTotal) * 100);
                  const danger =
                    status === "at_risk" || status === "not_delivered";
                  return (
                    <div key={status}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium">
                          {SHIPMENT_LABELS[status] ?? status}
                        </span>
                        <span className="text-muted-foreground">
                          {fmtInt(count)} · {pct}%
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full ${
                            danger ? "bg-destructive" : "bg-primary"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
