import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Pencil } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-server";
import { InfoRow } from "@/components/dashboard/users/info-row";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id }, select: { name: true } });
  return { title: user ? `${user.name} | JTP Logistics` : "Vendedor | JTP Logistics" };
}

export default async function VendorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const vendor = await prisma.user.findUnique({ where: { id } });

  if (!vendor || vendor.role !== "vendor") notFound();

  const initials = vendor.name
    .split(" ").slice(0, 2)
    .map((n: string) => n[0]).join("").toUpperCase();

  return (
    <div className="min-w-0 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link href="/admin/dashboard/vendors" aria-label="Volver a vendedores">
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-3 min-w-0">
            {vendor.image ? (
              <Image
                src={vendor.image}
                alt={vendor.name}
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
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl truncate">{vendor.name}</h1>
              <p className="text-muted-foreground text-xs sm:text-sm truncate">{vendor.email}</p>
            </div>
          </div>
        </div>
        <Button asChild className="shrink-0">
          <Link href={`/admin/dashboard/vendors/${id}/edit`}>
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
            <InfoRow label="Correo" value={vendor.email} />
            <InfoRow
              label="Fecha de nacimiento"
              value={
                vendor.birthDate
                  ? vendor.birthDate.toLocaleDateString("es-MX", {
                      year: "numeric", month: "long", day: "numeric",
                    })
                  : null
              }
            />
            <InfoRow
              label="Registro"
              value={vendor.createdAt.toLocaleDateString("es-MX", {
                year: "numeric", month: "long", day: "numeric",
              })}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
