"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useResourceEdit } from "@/hooks/use-resource-edit";
import { ResourceEditHeader } from "@/components/dashboard/resources/resource-edit-header";
import { EmployeeForm } from "@/components/dashboard/resources/employee-form";
import { AvatarUpload } from "@/components/ui/avatar-upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Laptop, Smartphone, Mail, ChevronRight } from "lucide-react";
import type { Employee, EmployeeFormData } from "@/types/resources.types";
import { formatPhone } from "@/lib/utils";

const MODULES = [
  { suffix: "Messages", label: "Mensajes" },
  { suffix: "Ideas", label: "Ideas" },
  { suffix: "Routes", label: "Rutas" },
  { suffix: "RouteLogs", label: "Historial de cambios" },
  { suffix: "UnitTypes", label: "Tipos de unidades" },
  { suffix: "Quotes", label: "Cotizador" },
  { suffix: "Providers", label: "Proveedores" },
  { suffix: "Clients", label: "Clientes" },
  { suffix: "Employees", label: "Colaboradores" },
  { suffix: "Vendors", label: "Vendedores" },
  { suffix: "Laptops", label: "Laptops" },
  { suffix: "Phones", label: "Celulares" },
  { suffix: "Emails", label: "Correos" },
  { suffix: "Tasks", label: "Tareas" },
  { suffix: "Shipments", label: "Embarques" },
  { suffix: "Finances", label: "Finanzas" },
] as const;

const PERMISSION_FIELDS = MODULES.flatMap((module) => [
  { key: `canView${module.suffix}`, label: `${module.label}: leer` },
  { key: `canCreate${module.suffix}`, label: `${module.label}: crear` },
  { key: `canUpdate${module.suffix}`, label: `${module.label}: editar` },
  { key: `canDelete${module.suffix}`, label: `${module.label}: eliminar` },
]);

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
  const { id } = useParams<{ id: string }>();

  const { data: employee, setData, isLoaded, error, isSubmitting, handleSubmit, handleDelete } =
    useResourceEdit<Employee>({
      endpoint: "/api/admin/employees",
      redirectHref: `/admin/dashboard/employees/${id}`,
      deleteRedirectHref: "/admin/dashboard/employees",
    });

  // Local permission state, initialized from employee data
  const [permissions, setPermissions] = useState<Record<string, boolean> | null>(null);

  // Initialize permissions when employee loads
  if (employee && permissions === null) {
    const initial: Record<string, boolean> = {};
    const employeePermissions = employee as unknown as Record<string, boolean | null | undefined>;
    for (const f of PERMISSION_FIELDS) {
      initial[f.key] = Boolean(employeePermissions[f.key]);
    }
    setPermissions(initial);
  }

  function togglePerm(key: string) {
    setPermissions((prev) => prev ? { ...prev, [key]: !prev[key] } : prev);
  }

  function setAllPermissions(value: boolean) {
    setPermissions((prev) => {
      if (!prev) return prev;
      const next = { ...prev };
      for (const perm of PERMISSION_FIELDS) {
        next[perm.key] = value;
      }
      return next;
    });
  }

  function onSubmit(formData: EmployeeFormData) {
    // Merge permissions into form data
    handleSubmit({ ...formData, ...permissions });
  }

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
        backHref={`/admin/dashboard/employees/${id}`}
        backLabel="Volver al perfil"
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
            cancelHref={`/admin/dashboard/employees/${id}`}
            onSubmit={onSubmit}
            isSubmitting={isSubmitting}
          >
            {/* Recursos vinculados */}
            {hasLinks && (
              <Card>
                <CardHeader className="space-y-1">
                  <CardTitle className="text-left text-base sm:text-lg">Recursos vinculados</CardTitle>
                  <CardDescription className="text-left text-xs sm:text-sm">
                    Laptops, celulares y correos asignados a este colaborador.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {laptops.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="flex items-center gap-2 text-left text-sm font-medium">
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
                      <h4 className="flex items-center gap-2 text-left text-sm font-medium">
                        <Smartphone className="size-4" />
                        Celulares ({phones.length})
                      </h4>
                      <div className="space-y-1">
                        {phones.map((p) => (
                          <LinkedResource key={p.id} href={`/admin/dashboard/phones/${p.id}`}>
                            <span>{p.name}</span>
                            {p.phoneNumber && (
                              <span className="text-muted-foreground text-xs">{formatPhone(p.phoneNumber)}</span>
                            )}
                          </LinkedResource>
                        ))}
                      </div>
                    </div>
                  )}
                  {emailAccounts.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="flex items-center gap-2 text-left text-sm font-medium">
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

            {/* Permisos */}
            {permissions && (
              <Card>
                <CardHeader className="space-y-1">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="text-left text-base sm:text-lg">Permisos</CardTitle>
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full sm:w-auto"
                        onClick={() => setAllPermissions(false)}
                      >
                        Quitar todos
                      </Button>
                      <Button
                        type="button"
                        variant="default"
                        className="w-full sm:w-auto"
                        onClick={() => setAllPermissions(true)}
                      >
                        Seleccionar todos
                      </Button>
                    </div>
                  </div>
                  <CardDescription className="text-left text-xs sm:text-sm">
                    Controla permisos por módulo para leer, crear, editar y eliminar.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-0">
                    {PERMISSION_FIELDS.map((perm) => (
                      <div key={perm.key}>
                        <div className="flex items-center justify-between gap-4 py-3">
                          <Label
                            htmlFor={`perm-${perm.key}`}
                            className="flex cursor-pointer flex-col items-start gap-0.5"
                          >
                            <span className="text-left text-sm font-medium">{perm.label}</span>
                          </Label>
                          <Switch
                            id={`perm-${perm.key}`}
                            checked={permissions[perm.key]}
                            onCheckedChange={() => togglePerm(perm.key)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </EmployeeForm>
        )}
      </div>
    </div>
  );
}
