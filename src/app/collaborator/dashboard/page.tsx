import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { BarChart3, FileText, Truck, Users } from "lucide-react";

export const metadata = {
  title: "Dashboard | JTP Logistics",
  description: "Panel de control del colaborador",
};

export default async function CollaboratorDashboard() {
  const session = await requireSession();

  // Obtener datos del usuario y estadísticas
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      role: true,
      canViewProviders: true,
      canViewQuotes: true,
      canViewClients: true,
      canViewRoutes: true,
    },
  });

  // Obtener cotizaciones creadas por este usuario
  const quotesCount = await prisma.generatedQuote.count({
    where: { createdById: session.user.id },
  });

  // Obtener clientes
  const clientsCount = await prisma.client.count();

  // Obtener rutas disponibles
  const routesCount = await prisma.route.count({
    where: { status: "active" },
  });

  // Obtener proveedores (carriers)
  const providersCount = await prisma.user.count({
    where: { role: "carrier" },
  });

  return (
    <div className="min-w-0 space-y-6">
      {/* Header */}
      <div className="min-w-0">
        <h1 className="page-heading">Bienvenido, {user?.name}</h1>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
          Panel de control • <span className="normal-case">{user?.email}</span>
        </p>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Cotizaciones */}
        {user?.canViewQuotes && (
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cotizaciones</CardTitle>
              <FileText className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{quotesCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {quotesCount === 0 ? "Sin cotizaciones aún" : "Cotizaciones creadas"}
              </p>
              <Button asChild variant="link" className="mt-3 h-auto p-0">
                <Link href="/collaborator/dashboard/quotes/{quotesCount === 0 ? 'new' : ''}">
                  {quotesCount === 0 ? "Crear primera cotización" : "Ver todas"}
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Clientes */}
        {user?.canViewClients && (
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes</CardTitle>
              <Users className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clientsCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Clientes registrados
              </p>
              <Button asChild variant="link" className="mt-3 h-auto p-0">
                <Link href="/collaborator/dashboard/clients">Ver todos</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Rutas */}
        {user?.canViewRoutes && (
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rutas</CardTitle>
              <BarChart3 className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{routesCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Rutas activas
              </p>
              <Button asChild variant="link" className="mt-3 h-auto p-0">
                <Link href="/collaborator/dashboard/routes">Ver todas</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Proveedores */}
        {user?.canViewProviders && (
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Proveedores</CardTitle>
              <Truck className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{providersCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Proveedores disponibles
              </p>
              <Button asChild variant="link" className="mt-3 h-auto p-0">
                <Link href="/collaborator/dashboard/providers">Ver todos</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Acciones rápidas */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {user?.canViewQuotes && (
              <Button asChild variant="outline" className="justify-start">
                <Link href="/collaborator/dashboard/quotes/new">
                  Crear cotización
                </Link>
              </Button>
            )}
            {user?.canViewClients && (
              <Button asChild variant="outline" className="justify-start">
                <Link href="/collaborator/dashboard/clients/new">
                  Nuevo cliente
                </Link>
              </Button>
            )}
            {user?.canViewProviders && (
              <Button asChild variant="outline" className="justify-start">
                <Link href="/collaborator/dashboard/providers">
                  Ver proveedores
                </Link>
              </Button>
            )}
            <Button asChild variant="outline" className="justify-start">
              <Link href="/collaborator/dashboard/profile">
                Mi perfil
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
