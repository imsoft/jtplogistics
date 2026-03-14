"use client";

import Link from "next/link";
import { useResourceEdit } from "@/hooks/use-resource-edit";
import { ResourceEditHeader } from "@/components/dashboard/resources/resource-edit-header";
import { EmployeeForm } from "@/components/dashboard/resources/employee-form";
import { AvatarUpload } from "@/components/ui/avatar-upload";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Laptop, Smartphone, Mail, ChevronRight } from "lucide-react";
import type { Employee } from "@/types/resources.types";

function LinkedResource({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-muted/50"
    >
      {children}
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

export default function EditEmployeePage() {
  const { data: employee, setData, isLoaded, error, isSubmitting, handleSubmit, handleDelete } =
    useResourceEdit<Employee>({
      endpoint: "/api/admin/employees",
      redirectHref: "/admin/dashboard/employees",
    });

  if (!isLoaded) return <p className="text-muted-foreground">Cargando…</p>;

  const laptops = employee?.laptops ?? [];
  const phones = employee?.phones ?? [];
  const emailAccounts = employee?.emailAccounts ?? [];
  const hasLinks = laptops.length > 0 || phones.length > 0 || emailAccounts.length > 0;

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <ResourceEditHeader
        title={employee?.name ?? "Colaborador"}
        description="Editar información del colaborador."
        backHref="/admin/dashboard/employees"
        backLabel="Volver a colaboradores"
        deleteTitle="¿Eliminar colaborador?"
        deleteDescription="Esta acción no se puede deshacer. Se eliminará el colaborador y su acceso al sistema."
        onDelete={handleDelete}
      />
      {employee && (
        <div className="flex items-center gap-4">
          <AvatarUpload
            currentImage={employee.image}
            name={employee.name}
            endpoint={`/api/admin/employees/${employee.id}/avatar`}
            onSuccess={(url) => setData((prev) => prev ? { ...prev, image: url } : prev)}
            size={72}
          />
          <p className="text-muted-foreground text-xs">Haz clic en la foto para cambiarla</p>
        </div>
      )}
      <div className="w-full min-w-0">
        {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
        {employee && (
          <EmployeeForm
            initialValues={employee}
            submitLabel="Guardar cambios"
            cancelHref="/admin/dashboard/employees"
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
      {hasLinks && (
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-base sm:text-lg">Recursos vinculados</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Laptops, celulares y correos asignados a este colaborador.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {laptops.length > 0 && (
              <div className="space-y-2">
                <h4 className="flex items-center gap-2 text-sm font-medium">
                  <Laptop className="size-4" />
                  Laptops ({laptops.length})
                </h4>
                <div className="space-y-1">
                  {laptops.map((l) => (
                    <LinkedResource key={l.id} href={`/admin/dashboard/laptops/${l.id}`}>
                      <span>{l.name}</span>
                      {l.serialNumber && (
                        <span className="text-muted-foreground text-xs">{l.serialNumber}</span>
                      )}
                    </LinkedResource>
                  ))}
                </div>
              </div>
            )}
            {phones.length > 0 && (
              <div className="space-y-2">
                <h4 className="flex items-center gap-2 text-sm font-medium">
                  <Smartphone className="size-4" />
                  Celulares ({phones.length})
                </h4>
                <div className="space-y-1">
                  {phones.map((p) => (
                    <LinkedResource key={p.id} href={`/admin/dashboard/phones/${p.id}`}>
                      <span>{p.name}</span>
                      {p.phoneNumber && (
                        <span className="text-muted-foreground text-xs">{p.phoneNumber}</span>
                      )}
                    </LinkedResource>
                  ))}
                </div>
              </div>
            )}
            {emailAccounts.length > 0 && (
              <div className="space-y-2">
                <h4 className="flex items-center gap-2 text-sm font-medium">
                  <Mail className="size-4" />
                  Correos ({emailAccounts.length})
                </h4>
                <div className="space-y-1">
                  {emailAccounts.map((ea) => (
                    <LinkedResource key={ea.id} href={`/admin/dashboard/emails/${ea.id}`}>
                      <span>{ea.email}</span>
                      <span className="text-muted-foreground text-xs">{ea.type}</span>
                    </LinkedResource>
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
