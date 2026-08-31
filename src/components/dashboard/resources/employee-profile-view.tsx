"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Pencil, Laptop, Smartphone, Mail, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoRow } from "@/components/dashboard/users/info-row";
import { SecretRow } from "@/components/dashboard/users/secret-row";
import { ResetPasswordButton } from "@/components/dashboard/resources/reset-password-button";
import { useResourceEdit } from "@/hooks/use-resource-edit";
import type { Employee } from "@/types/resources.types";
import { formatPhone } from "@/lib/utils";
import { ResourceDetailSkeleton } from "@/components/ui/skeletons";

interface EmployeeProfileViewProps {
  /** De dónde se lee la ficha: cada panel tiene su endpoint. */
  apiEndpoint: string;
  /** Listado al que vuelve la flecha. */
  listPath: string;
  /**
   * Base de los paneles de activos, para enlazar la laptop o el correo. Si el
   * panel no tiene esas pantallas se pasa null y las tarjetas no enlazan.
   */
  resourcesBasePath: string | null;
  /** Enlace de edición; se omite en los paneles de solo lectura. */
  editPath?: string;
  /** Muestra el botón para restablecer la contraseña de acceso. */
  canResetPassword?: boolean;
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    year: "numeric", month: "long", day: "numeric",
    timeZone: "UTC",
  });
}

function ageFromDate(iso: string): string {
  const birth = new Date(iso + "T00:00:00Z");
  const now = new Date();
  let years = now.getFullYear() - birth.getUTCFullYear();
  let months = now.getMonth() - birth.getUTCMonth();
  if (months < 0) { years--; months += 12; }
  if (years > 0 && months > 0) return `${years} años, ${months} mes${months !== 1 ? "es" : ""}`;
  if (years > 0) return `${years} año${years !== 1 ? "s" : ""}`;
  return `${months} mes${months !== 1 ? "es" : ""}`;
}

function ResourceCardHeader({
  name,
  imageUrl,
  href,
  isEmail = false,
}: {
  name: string;
  imageUrl: string | null;
  href: string | null;
  isEmail?: boolean;
}) {
  const content = (
    <>
      <span className="flex min-w-0 items-center gap-2">
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={name} className="size-8 shrink-0 rounded object-cover" />
        )}
        <span className={`truncate text-sm font-medium${isEmail ? " text-email" : ""}`}>{name}</span>
      </span>
      {href && (
        <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
          Ver ficha
          <ChevronRight className="size-4" />
        </span>
      )}
    </>
  );

  const className =
    "flex items-center justify-between gap-2 border-b px-3 py-2 sm:px-4" +
    (href ? " transition-colors hover:bg-muted/50" : "");

  return href ? (
    <Link href={href} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}

export function EmployeeProfileView({
  apiEndpoint,
  listPath,
  resourcesBasePath,
  editPath,
  canResetPassword = false,
}: EmployeeProfileViewProps) {
  const { id } = useParams<{ id: string }>();
  const { data: employee, isLoaded, error } = useResourceEdit<Employee>({
    endpoint: apiEndpoint,
    redirectHref: listPath,
  });

  const resourceHref = (kind: "laptops" | "phones" | "emails", resourceId: string) =>
    resourcesBasePath ? `${resourcesBasePath}/${kind}/${resourceId}` : null;

  if (!isLoaded) return <ResourceDetailSkeleton />;
  if (error || !employee) return <p className="text-destructive py-6 text-sm">{error ?? "No encontrado"}</p>;

  const laptops = employee.laptops ?? [];
  const phones = employee.phones ?? [];
  const emailAccounts = employee.emailAccounts ?? [];
  const hasLinks = laptops.length > 0 || phones.length > 0 || emailAccounts.length > 0;

  return (
    <div className="min-w-0 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link href={listPath} aria-label="Volver a colaboradores">
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-3 min-w-0">
            {employee.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={employee.image}
                alt={employee.name}
                className="size-10 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                {initials(employee.name)}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="page-heading truncate">{employee.name}</h1>
              {(employee.position || employee.department) && (
                <p className="text-muted-foreground text-xs sm:text-sm truncate">
                  {[employee.position, employee.department].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {canResetPassword && (
            <ResetPasswordButton employeeId={id} employeeName={employee.name} />
          )}
          {editPath && (
            <Button asChild>
              <Link href={editPath}>
                <Pencil className="size-4" />
                Editar
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Información
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
            <InfoRow label="Correo" value={employee.email} isEmail />
            <InfoRow label="Teléfono" value={formatPhone(employee.phone)} />
            <InfoRow
              label="Fecha de nacimiento"
              value={employee.birthDate ? `${formatDate(employee.birthDate)} (${ageFromDate(employee.birthDate)})` : null}
            />
            <InfoRow
              label="Fecha de ingreso"
              value={employee.hireDate ? `${formatDate(employee.hireDate)} (${ageFromDate(employee.hireDate)})` : null}
            />
            <InfoRow label="Puesto" value={employee.position} />
            <InfoRow label="Departamento" value={employee.department} />
            <InfoRow label="NSS" value={employee.nss} />
            <InfoRow label="RFC" value={employee.rfc} />
            <InfoRow label="CURP" value={employee.curp} />
            <InfoRow label="Domicilio" value={employee.address} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Recursos vinculados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 pb-4">
          {!hasLinks && (
            <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">
              Este colaborador no tiene laptops, celulares ni correos asignados. Asígnalos desde la
              ficha de cada equipo o correo.
            </p>
          )}
            {laptops.length > 0 && (
              <div className="space-y-2">
                <h4 className="flex items-center gap-2 text-sm font-medium">
                  <Laptop className="size-4" /> Laptops ({laptops.length})
                </h4>
                <div className="space-y-2">
                  {laptops.map((l) => (
                    <div key={l.id} className="rounded-lg border">
                      <ResourceCardHeader
                        name={l.name}
                        imageUrl={l.imageUrl}
                        href={resourceHref("laptops", l.id)}
                      />
                      <div className="grid grid-cols-1 gap-x-8 px-3 pb-3 sm:grid-cols-2 sm:px-4">
                        <InfoRow label="Código de equipo" value={l.equipmentCode} />
                        <InfoRow label="Tipo de equipo" value={l.equipmentType} />
                        <InfoRow label="Marca" value={l.brand} />
                        <InfoRow label="Modelo" value={l.model} />
                        <InfoRow label="Color" value={l.color} />
                        <InfoRow label="Número de serie" value={l.serialNumber} />
                        <SecretRow type="laptop" resourceId={l.id} hasPassword={l.hasPassword} />
                        <InfoRow label="Estado general" value={l.generalState} />
                        <InfoRow label="Accesorios" value={l.accessories} />
                        <InfoRow label="Software" value={l.software} />
                        <InfoRow label="Proveedor de mantenimiento" value={l.maintenanceProvider} />
                        <InfoRow
                          label="Correo vinculado"
                          value={
                            l.emailAccount ? (
                              resourcesBasePath ? (
                                <Link
                                  href={`${resourcesBasePath}/emails/${l.emailAccount.id}`}
                                  className="text-primary underline underline-offset-2 text-email"
                                >
                                  {l.emailAccount.email}
                                </Link>
                              ) : (
                                <span className="text-email">{l.emailAccount.email}</span>
                              )
                            ) : null
                          }
                        />
                        <InfoRow label="Observaciones" value={l.observations} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {phones.length > 0 && (
              <div className="space-y-2">
                <h4 className="flex items-center gap-2 text-sm font-medium">
                  <Smartphone className="size-4" /> Celulares ({phones.length})
                </h4>
                <div className="space-y-2">
                  {phones.map((p) => (
                    <div key={p.id} className="rounded-lg border">
                      <ResourceCardHeader
                        name={p.name}
                        imageUrl={p.imageUrl}
                        href={resourceHref("phones", p.id)}
                      />
                      <div className="grid grid-cols-1 gap-x-8 px-3 pb-3 sm:grid-cols-2 sm:px-4">
                        <InfoRow label="Código de equipo" value={p.equipmentCode} />
                        <InfoRow label="Número telefónico" value={formatPhone(p.phoneNumber)} />
                        <InfoRow label="IMEI" value={p.imei} />
                        <InfoRow label="Número de serie" value={p.serialNumber} />
                        <InfoRow label="Marca" value={p.brand} />
                        <InfoRow label="Modelo" value={p.model} />
                        <InfoRow label="Color" value={p.color} />
                        <SecretRow type="phone" resourceId={p.id} hasPassword={p.hasPassword} />
                        <InfoRow label="Proveedor de mantenimiento" value={p.maintenanceProvider} />
                        <InfoRow
                          label="Correo vinculado"
                          value={
                            p.emailAccount ? (
                              resourcesBasePath ? (
                                <Link
                                  href={`${resourcesBasePath}/emails/${p.emailAccount.id}`}
                                  className="text-primary underline underline-offset-2 text-email"
                                >
                                  {p.emailAccount.email}
                                </Link>
                              ) : (
                                <span className="text-email">{p.emailAccount.email}</span>
                              )
                            ) : null
                          }
                        />
                        <InfoRow label="Observaciones" value={p.observations} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {emailAccounts.length > 0 && (
              <div className="space-y-2">
                <h4 className="flex items-center gap-2 text-sm font-medium">
                  <Mail className="size-4" /> Correos ({emailAccounts.length})
                </h4>
                <div className="space-y-2">
                  {emailAccounts.map((ea) => (
                    <div key={ea.id} className="rounded-lg border">
                      <ResourceCardHeader
                        name={ea.email}
                        isEmail
                        imageUrl={null}
                        href={resourceHref("emails", ea.id)}
                      />
                      <div className="grid grid-cols-1 gap-x-8 px-3 pb-3 sm:grid-cols-2 sm:px-4">
                        <InfoRow label="Tipo" value={ea.type} />
                        <SecretRow type="email" resourceId={ea.id} hasPassword={ea.hasPassword} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
