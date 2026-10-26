"use client";

import { useParams } from "next/navigation";
import { notFound } from "next/navigation";
import { ResourceListPage } from "@/components/dashboard/resources/resource-list-page";
import { DashboardHomeSkeleton } from "@/components/ui/skeletons";
import { BILLING_KIND_LABELS, type BillingKind } from "@/lib/billing";
import { useBillingPerms } from "./billing-shared";
import { DocumentsView } from "./documents-view";
import { DocumentDetailView, EditDocumentView, NewDocumentView } from "./document-views";
import { BankDetailView, BanksView } from "./banks-view";
import { ExpensesView } from "./expenses-view";

type Panel = "admin" | "collaborator";

const SLUG_TO_KIND: Record<string, BillingKind> = { receivables: "receivable", payables: "payable" };
const base = (panel: Panel) => `/${panel}/dashboard/billing`;

function useKind(): { kind: BillingKind; slug: string } {
  const { kind: slug } = useParams<{ kind: string }>();
  const kind = SLUG_TO_KIND[slug];
  if (!kind) notFound();
  return { kind, slug };
}

function NoAccess() {
  return (
    <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
      No tienes permiso de Administración (cobranza, pagos y bancos). Pídelo a dirección.
    </p>
  );
}

export function DocumentsPage({ panel }: { panel: Panel }) {
  const { kind, slug } = useKind();
  const perms = useBillingPerms(panel);
  const labels = BILLING_KIND_LABELS[kind];
  if (!perms.isLoaded) return <DashboardHomeSkeleton />;
  return (
    <ResourceListPage
      title={labels.plural}
      description={
        kind === "receivable"
          ? "Facturas a clientes: cuánto falta por cobrar, qué está vencido y los cobros registrados."
          : "Facturas de transportistas y proveedores: cuánto falta por pagar y los pagos hechos."
      }
      newHref={perms.canCreate ? `${base(panel)}/${slug}/new` : undefined}
      newLabel="Nueva factura"
    >
      {perms.canView ? (
        <DocumentsView kind={kind} basePath={`${base(panel)}/${slug}`} canCreate={perms.canCreate} canUpdate={perms.canUpdate} />
      ) : (
        <NoAccess />
      )}
    </ResourceListPage>
  );
}

export function NewDocumentPage({ panel }: { panel: Panel }) {
  const { kind, slug } = useKind();
  return <NewDocumentView kind={kind} basePath={`${base(panel)}/${slug}`} />;
}

export function EditDocumentPage({ panel }: { panel: Panel }) {
  const { kind, slug } = useKind();
  const perms = useBillingPerms(panel);
  return <EditDocumentView kind={kind} basePath={`${base(panel)}/${slug}`} canDelete={perms.canDelete} />;
}

export function DocumentDetailPage({ panel }: { panel: Panel }) {
  const { slug } = useKind();
  const perms = useBillingPerms(panel);
  if (!perms.isLoaded) return <DashboardHomeSkeleton />;
  if (!perms.canView) return <NoAccess />;
  return <DocumentDetailView basePath={`${base(panel)}/${slug}`} canUpdate={perms.canUpdate} canDelete={perms.canDelete} />;
}

export function BanksPage({ panel }: { panel: Panel }) {
  const perms = useBillingPerms(panel);
  if (!perms.isLoaded) return <DashboardHomeSkeleton />;
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div>
        <h1 className="page-heading">Bancos</h1>
        <p className="text-muted-foreground text-sm">Cuentas de la empresa, su saldo y la conciliación contra el estado de cuenta.</p>
      </div>
      {perms.canView ? <BanksView basePath={`${base(panel)}/banks`} canCreate={perms.canCreate} /> : <NoAccess />}
    </div>
  );
}

export function BankDetailPage({ panel }: { panel: Panel }) {
  const perms = useBillingPerms(panel);
  if (!perms.isLoaded) return <DashboardHomeSkeleton />;
  if (!perms.canView) return <NoAccess />;
  return (
    <BankDetailView
      basePath={`${base(panel)}/banks`}
      billingBase={base(panel)}
      canCreate={perms.canCreate}
      canUpdate={perms.canUpdate}
      canDelete={perms.canDelete}
    />
  );
}

export function ExpensesPage({ panel }: { panel: Panel }) {
  const perms = useBillingPerms(panel);
  if (!perms.isLoaded) return <DashboardHomeSkeleton />;
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div>
        <h1 className="page-heading">Gastos</h1>
        <p className="text-muted-foreground text-sm">Gastos de operación de la empresa, por mes y por categoría.</p>
      </div>
      {perms.canView ? <ExpensesView canCreate={perms.canCreate} canUpdate={perms.canUpdate} canDelete={perms.canDelete} /> : <NoAccess />}
    </div>
  );
}
