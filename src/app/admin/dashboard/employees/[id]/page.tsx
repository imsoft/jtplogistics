import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Pencil, Laptop, Smartphone, Mail, ChevronRight } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-server";
import { InfoRow } from "@/components/dashboard/users/info-row";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id }, select: { name: true } });
  return { title: user ? `${user.name} | JTP Logistics` : "Colaborador | JTP Logistics" };
}

export default async function EmployeeProfilePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const employee = await prisma.user.findUnique({
    where: { id },
    include: {
      employeeProfile: true,
      assignedLaptops: {
        include: { emailAccount: { select: { id: true, email: true } } },
      },
      assignedPhones: {
        include: { emailAccount: { select: { id: true, email: true } } },
      },
      assignedEmails: {
        include: { emailAccount: { select: { id: true, type: true, email: true } } },
      },
    },
  });

  if (!employee || employee.role !== "collaborator") notFound();

  const initials = employee.name
    .split(" ").slice(0, 2)
    .map((n: string) => n[0]).join("").toUpperCase();

  const laptops = employee.assignedLaptops;
  const phones = employee.assignedPhones;
  const emailAccounts = employee.assignedEmails.map((ea) => ea.emailAccount);
  const hasLinks = laptops.length > 0 || phones.length > 0 || emailAccounts.length > 0;

  return (
    <div className="min-w-0 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link href="/admin/dashboard/employees" aria-label="Volver a colaboradores">
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-3 min-w-0">
            {employee.image ? (
              <Image
                src={employee.image}
                alt={employee.name}
                width={40}
                height={40}
                className="size-10 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl truncate">{employee.name}</h1>
              {(employee.employeeProfile?.position || employee.employeeProfile?.department) && (
                <p className="text-muted-foreground text-xs sm:text-sm truncate">
                  {[employee.employeeProfile.position, employee.employeeProfile.department]
                    .filter(Boolean).join(" · ")}
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
            <InfoRow label="Teléfono" value={employee.employeeProfile?.phone} />
            <InfoRow
              label="Fecha de nacimiento"
              value={
                employee.birthDate
                  ? employee.birthDate.toLocaleDateString("es-MX", {
                      year: "numeric", month: "long", day: "numeric",
                    })
                  : null
              }
            />
            <InfoRow label="Puesto" value={employee.employeeProfile?.position} />
            <InfoRow label="Departamento" value={employee.employeeProfile?.department} />
            <InfoRow
              label="Registro"
              value={employee.createdAt.toLocaleDateString("es-MX", {
                year: "numeric", month: "long", day: "numeric",
              })}
            />
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
                      {p.phoneNumber && <span className="text-muted-foreground text-xs">{p.phoneNumber}</span>}
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
