import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-server";
import { InfoRow } from "@/components/dashboard/users/info-row";
import { ClientViewActions } from "@/components/dashboard/clients/client-view-actions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await prisma.client.findUnique({ where: { id }, select: { name: true } });
  return { title: client ? `${client.name} | JTP Logistics` : "Cliente | JTP Logistics" };
}

export default async function ClientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      clientRoutes: {
        include: { route: { select: { origin: true, destination: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!client) notFound();

  const initials = client.name
    .split(" ").slice(0, 2)
    .map((n) => n[0]).join("").toUpperCase();

  return (
    <div className="min-w-0 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link href="/admin/dashboard/clients" aria-label="Volver a clientes">
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
              {initials}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl truncate">{client.name}</h1>
              {client.legalName && (
                <p className="text-muted-foreground text-xs sm:text-sm truncate">{client.legalName}</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ClientViewActions clientId={id} />
          <Button asChild>
            <Link href={`/admin/dashboard/clients/${id}/edit`}>
              <Pencil className="size-4" />
              Editar
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Información
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <InfoRow label="RFC" value={client.rfc} />
            <InfoRow label="Correo" value={client.email} />
            <InfoRow label="Teléfono" value={client.phone} />
            <InfoRow label="Dirección" value={client.address} />
            <InfoRow
              label="Registro"
              value={client.createdAt.toLocaleDateString("es-MX", {
                year: "numeric", month: "long", day: "numeric",
              })}
            />
          </CardContent>
        </Card>

        {client.notes && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Notas
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Rutas asignadas */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Rutas asignadas ({client.clientRoutes.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {client.clientRoutes.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">
              No hay rutas asignadas. Usa el botón "Seleccionar rutas" para asignarlas.
            </p>
          ) : (
            <div>
              {client.clientRoutes.map((cr) => (
                <div key={cr.id} className="border-b py-2.5 last:border-0 text-sm font-medium">
                  {cr.route.origin} → {cr.route.destination}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
