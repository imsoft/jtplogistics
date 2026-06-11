import { Separator } from "@/components/ui/separator";
import { UsersTable } from "@/components/dashboard/users/users-table";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-server";

export const metadata = {
  title: "Proveedores | JTP Logistics",
  description: "Ver proveedores (transportistas) registrados",
};

export default async function ProvidersPage() {
  await requireAdmin();
  const providersCount = await prisma.user.count({ where: { role: "carrier" } });

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="min-w-0">
        <h1 className="page-heading">
          Proveedores{" "}
          <span className="text-muted-foreground font-normal">({providersCount})</span>
        </h1>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
          {providersCount === 1
            ? "1 transportista registrado en la plataforma."
            : `${providersCount} transportistas registrados en la plataforma.`}
        </p>
      </div>
      <Separator />
      <UsersTable defaultRole="carrier" detailBasePath="/admin/dashboard/providers" />
    </div>
  );
}
