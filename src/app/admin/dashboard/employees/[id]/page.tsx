"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Pencil, Laptop, Smartphone, Mail, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoRow } from "@/components/dashboard/users/info-row";
import { useResourceEdit } from "@/hooks/use-resource-edit";
import type { Employee } from "@/types/resources.types";
import { formatPhone } from "@/lib/utils";

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    year: "numeric", month: "long", day: "numeric",
  });
}

export default function EmployeeProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { data: employee, isLoaded, error } = useResourceEdit<Employee>({
    endpoint: "/api/admin/employees",
    redirectHref: "/admin/dashboard/employees",
  });

  if (!isLoaded) return <p className="text-muted-foreground py-6">Cargando…</p>;
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
            <Link href="/admin/dashboard/employees" aria-label="Volver a colaboradores">
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
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl truncate">{employee.name}</h1>
              {(employee.position || employee.department) && (
                <p className="text-muted-foreground text-xs sm:text-sm truncate">
                  {[employee.position, employee.department].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
          </div>
        </div>
        <Button asChild className="shrink-0">
          <Link href={`/admin/dashboard/employees/${id}/edit`}>
            <Pencil className="size-4" />
            Editar
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Información
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <InfoRow label="Correo" value={employee.email} />
            <InfoRow label="Teléfono" value={formatPhone(employee.phone)} />
            <InfoRow
              label="Fecha de nacimiento"
              value={employee.birthDate ? formatDate(employee.birthDate) : null}
            />
            <InfoRow label="Puesto" value={employee.position} />
            <InfoRow label="Departamento" value={employee.department} />
            <InfoRow label="Registro" value={formatDate(employee.createdAt)} />
          </CardContent>
        </Card>
      </div>

      {/* Recursos vinculados */}
      {hasLinks && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Recursos vinculados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-4 pb-4">
            {laptops.length > 0 && (
              <div className="space-y-2">
                <h4 className="flex items-center gap-2 text-sm font-medium">
                  <Laptop className="size-4" /> Laptops ({laptops.length})
                </h4>
                <div className="space-y-1">
                  {laptops.map((l) => (
                    <Link
                      key={l.id}
                      href={`/admin/dashboard/laptops/${l.id}`}
                      className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-muted/50"
                    >
                      <span>{l.name}</span>
                      {l.serialNumber && <span className="text-muted-foreground text-xs">{l.serialNumber}</span>}
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {phones.length > 0 && (
              <div className="space-y-2">
                <h4 className="flex items-center gap-2 text-sm font-medium">
                  <Smartphone className="size-4" /> Celulares ({phones.length})
                </h4>
                <div className="space-y-1">
                  {phones.map((p) => (
                    <Link
                      key={p.id}
                      href={`/admin/dashboard/phones/${p.id}`}
                      className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-muted/50"
                    >
                      <span>{p.name}</span>
                      {p.phoneNumber && <span className="text-muted-foreground text-xs">{formatPhone(p.phoneNumber)}</span>}
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {emailAccounts.length > 0 && (
              <div className="space-y-2">
                <h4 className="flex items-center gap-2 text-sm font-medium">
                  <Mail className="size-4" /> Correos ({emailAccounts.length})
                </h4>
                <div className="space-y-1">
                  {emailAccounts.map((ea) => (
                    <Link
                      key={ea.id}
                      href={`/admin/dashboard/emails/${ea.id}`}
                      className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-muted/50"
                    >
                      <span>{ea.email}</span>
                      <span className="text-muted-foreground text-xs">{ea.type}</span>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    </Link>
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
