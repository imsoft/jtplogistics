import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-server";
import { USER_ROLE_LABELS } from "@/lib/constants/user-role";
import { InfoRow } from "@/components/dashboard/users/info-row";
import { formatPhone } from "@/lib/utils";
import { TargetDiff } from "@/components/dashboard/users/target-diff";
import { ToggleCarrierPermissions } from "@/components/dashboard/users/toggle-carrier-permissions";
import { CarrierRouteUnlockRequests } from "@/components/dashboard/users/carrier-route-unlock-requests";
import { DeleteUserButton } from "@/components/dashboard/users/delete-user-button";
import type { UserRole } from "@/types/user.types";

/** Alineado con el modelo Contact de Prisma (tipado explícito para el include del perfil). */
type ProfileContact = {
  id: string;
  profileId: string;
  type: "phone" | "email";
  value: string;
  label: string | null;
  createdAt: Date;
};

type CarrierRouteListItem = {
  id: string;
  unitType: string;
  carrierTarget: number | null;
  editUnlockRequested: boolean;
  editUnlockApproved: boolean;
  route: {
    origin: string;
    destination: string;
    description: string | null;
    target: number | null;
  };
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id }, select: { name: true } });
  return {
    title: user ? `${user.name} | JTP Logistics` : "Usuario | JTP Logistics",
  };
}

function formatMxn(value: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(value);
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      profile: {
        include: { contacts: { orderBy: { createdAt: "asc" } } },
      },
      carrierRoutes: {
        include: { route: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!user) notFound();

  const initials = user.name
    .split(" ")
    .slice(0, 2)
    .map((n: string) => n[0])
    .join("")
    .toUpperCase();

  const isCarrier = user.role === "carrier";
  const isDeletable = user.role === "carrier" || user.role === "collaborator";

  const contacts = (user.profile?.contacts ?? []) as ProfileContact[];
  const phones = contacts.filter((c) => c.type === "phone");
  const emails = contacts.filter((c) => c.type === "email");
  const carrierRoutes = user.carrierRoutes as CarrierRouteListItem[];
  const pendingUnlockRequests = carrierRoutes
    .filter((cr) => cr.editUnlockRequested && !cr.editUnlockApproved)
    .map((cr) => ({
      id: cr.id,
      origin: cr.route.origin,
      destination: cr.route.destination,
      unitType: cr.unitType,
    }));

  return (
    <div className="min-w-0 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href="/admin/dashboard/users" aria-label="Volver a usuarios">
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
        <div className="flex min-w-0 items-center gap-3">
          <div className="bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
            {initials}
          </div>
          <div className="min-w-0">
            <h1 className="page-heading truncate">
              {user.profile?.commercialName ?? user.name}
            </h1>
            {user.profile?.commercialName && (
              <p className="truncate text-sm font-medium text-foreground/70">
                {user.name}
              </p>
            )}
            <p className="text-muted-foreground truncate text-xs sm:text-sm">
              {user.email}
            </p>
          </div>
        </div>
        </div>
        {isDeletable && (
          <DeleteUserButton
            userId={user.id}
            userName={user.profile?.commercialName ?? user.name}
          />
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Cuenta */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Cuenta
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <InfoRow label="Rol" value={USER_ROLE_LABELS[user.role as UserRole]} />
            <InfoRow
              label="Registro"
              value={user.createdAt.toLocaleDateString("es-MX", {
                year: "numeric", month: "long", day: "numeric",
              })}
            />
            <InfoRow
              label="Última actualización"
              value={user.updatedAt.toLocaleDateString("es-MX", {
                year: "numeric", month: "long", day: "numeric",
              })}
            />
          </CardContent>
        </Card>

        {/* Perfil */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Perfil
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {user.profile ? (
              <>
                <InfoRow label="Nombre comercial" value={user.profile.commercialName} />
                <InfoRow label="Razón social"     value={user.profile.legalName} />
                <InfoRow label="RFC"              value={user.profile.rfc} />
                <InfoRow label="Dirección"        value={user.profile.address} />
              </>
            ) : (
              <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">
                Este usuario no tiene perfil registrado.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Contactos */}
      {user.profile && (phones.length > 0 || emails.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {phones.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Phone className="size-3.5" /> Teléfonos
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {phones.map((c) => (
                  <div key={c.id} className="flex flex-col gap-0.5 border-b py-3 last:border-0 sm:grid sm:grid-cols-[140px_1fr] sm:gap-2">
                    <span className="text-muted-foreground text-sm">{c.label ?? "Teléfono"}</span>
                    <span className="text-sm font-medium">{formatPhone(c.value)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {emails.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Mail className="size-3.5" /> Correos
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {emails.map((c) => (
                  <div key={c.id} className="flex flex-col gap-0.5 border-b py-3 last:border-0 sm:grid sm:grid-cols-[140px_1fr] sm:gap-2">
                    <span className="text-muted-foreground text-sm">{c.label ?? "Correo"}</span>
                    <span className="text-sm font-medium break-all">{c.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Rutas seleccionadas — solo para carriers */}
      {isCarrier && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Rutas seleccionadas ({carrierRoutes.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0 space-y-3">
            <CarrierRouteUnlockRequests
              carrierId={user.id}
              initialRequests={pendingUnlockRequests}
            />
            <ToggleCarrierPermissions
              userId={user.id}
              initialCanEditRoutes={user.canEditRoutes}
              initialCanEditTarget={user.canEditTarget}
              initialCanAddRoutes={user.canAddRoutes}
            />
          </CardContent>
          <CardContent className="px-0 pb-0">
            {carrierRoutes.length === 0 ? (
              <p className="text-muted-foreground rounded-lg border border-dashed mx-4 mb-4 p-4 text-center text-sm">
                Este transportista no ha seleccionado ninguna ruta.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[420px]">
                <div className="grid grid-cols-[1fr_120px_120px_72px] gap-3 border-b bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
                  <span>Ruta</span>
                  <span>Target JTP</span>
                  <span>Target carrier</span>
                  <span>Dif.</span>
                </div>
                {carrierRoutes.map((cr) => (
                  <div
                    key={cr.id}
                    className="grid grid-cols-[1fr_120px_120px_72px] gap-3 items-center border-b px-4 py-3 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {cr.route.origin} → {cr.route.destination}
                      </p>
                      {cr.route.description && (
                        <p className="text-muted-foreground truncate text-xs">
                          {cr.route.description}
                        </p>
                      )}
                    </div>
                    <span className="font-mono text-sm text-muted-foreground">
                      {cr.route.target != null ? formatMxn(cr.route.target) : "—"}
                    </span>
                    <span className="font-mono text-sm font-medium">
                      {cr.carrierTarget != null ? formatMxn(cr.carrierTarget) : "—"}
                    </span>
                    <TargetDiff jtpTarget={cr.route.target} carrierTarget={cr.carrierTarget} />
                  </div>
                ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
