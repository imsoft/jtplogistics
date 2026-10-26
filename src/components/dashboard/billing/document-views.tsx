"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, HandCoins, Loader2, Pencil, Trash2, Ban, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormSkeleton, ResourceDetailSkeleton } from "@/components/ui/skeletons";
import { InfoRow } from "@/components/dashboard/users/info-row";
import { ResourceNewPage } from "@/components/dashboard/resources/resource-new-page";
import { ResourceEditHeader } from "@/components/dashboard/resources/resource-edit-header";
import { useResourceCreate } from "@/hooks/use-resource-create";
import { useResourceEdit } from "@/hooks/use-resource-edit";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BILLING_KIND_LABELS, SAT_PAYMENT_FORMS, type BillingKind } from "@/lib/billing";
import { DocumentForm, documentToForm, emptyDocumentForm } from "./document-form";
import { PaymentDialog } from "./payment-dialog";
import { CartaPorteCard } from "./carta-porte-card";
import { AttachmentsCard } from "./attachments-card";
import { StatusBadge, folioLabel, money, shortDay, useBankAccounts, type BillingDocument } from "./billing-shared";

const FORM_LABEL = Object.fromEntries(SAT_PAYMENT_FORMS.map((f) => [f.value, f.label]));

export function NewDocumentView({ kind, basePath }: { kind: BillingKind; basePath: string }) {
  const { error, isSubmitting, handleSubmit } = useResourceCreate({ endpoint: "/api/billing/documents", redirectHref: basePath });
  const labels = BILLING_KIND_LABELS[kind];
  return (
    <ResourceNewPage
      title={`Nueva ${labels.singular.toLowerCase()}`}
      description={kind === "receivable" ? "Factura emitida a un cliente." : "Factura recibida de un transportista o proveedor."}
      backHref={basePath}
      backLabel={`Volver a ${labels.plural.toLowerCase()}`}
      error={error}
    >
      <DocumentForm kind={kind} initialValues={emptyDocumentForm(kind)} submitLabel="Guardar factura" cancelHref={basePath} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </ResourceNewPage>
  );
}

export function EditDocumentView({ kind, basePath, canDelete }: { kind: BillingKind; basePath: string; canDelete: boolean }) {
  const { id } = useParams<{ id: string }>();
  const { data, isLoaded, error, isSubmitting, handleSubmit, handleDelete } = useResourceEdit<BillingDocument>({
    endpoint: "/api/billing/documents",
    redirectHref: `${basePath}/${id}`,
    deleteRedirectHref: basePath,
  });
  if (!isLoaded) return <FormSkeleton />;
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <ResourceEditHeader
        title={data ? (data.draft ? "Borrador" : `Factura ${folioLabel(data)}`) : "Factura"}
        description={data?.partyName ?? ""}
        backHref={`${basePath}/${id}`}
        backLabel="Volver a la factura"
        deleteTitle="¿Eliminar esta factura?"
        deleteDescription="Solo se puede si no tiene pagos. Para dejar constancia, mejor cancélala."
        onDelete={handleDelete}
        showDelete={canDelete && (data?.payments.length ?? 0) === 0}
      />
      {error && <p className="text-destructive text-sm">{error}</p>}
      {data && (
        <DocumentForm
          kind={kind}
          initialValues={documentToForm(data)}
          lockedAmounts={data.fromXml ? data : undefined}
          submitLabel="Guardar cambios"
          cancelHref={`${basePath}/${id}`}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}

export function DocumentDetailView({
  basePath,
  canUpdate,
  canDelete,
}: {
  basePath: string;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [doc, setDoc] = useState<BillingDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const [removing, setRemoving] = useState<BillingDocument["payments"][number] | null>(null);
  const [busy, setBusy] = useState(false);
  const accounts = useBankAccounts();

  const load = useCallback(() => {
    fetch(`/api/billing/documents/${id}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(r.status === 404 ? "Esta factura ya no existe." : "No se pudo cargar la factura.");
        return r.json();
      })
      .then((d: BillingDocument) => setDoc(d))
      .catch((e: Error) => setError(e.message));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function patch(body: Record<string, unknown>, ok: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/billing/documents/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "No se pudo guardar.");
      toast.success(ok);
      setCancelling(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }

  async function removePayment(paymentId: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/billing/payments/${paymentId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "No se pudo borrar.");
      const d = (await res.json().catch(() => ({}))) as { removed?: number };
      toast.success(d.removed && d.removed > 1 ? `Transferencia borrada: ${d.removed} pagos y su movimiento de banco.` : "Pago borrado y su movimiento de banco también.");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo borrar.");
    } finally {
      setBusy(false);
      setRemoving(null);
    }
  }

  if (error) return <p className="text-destructive py-6 text-sm">{error}</p>;
  if (!doc) return <ResourceDetailSkeleton />;
  const labels = BILLING_KIND_LABELS[doc.kind];
  const cancelled = doc.status === "cancelada";
  const shipmentsHref = basePath.startsWith("/admin") ? "/admin/dashboard/shipments" : "/collaborator/dashboard/shipments";

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link href={basePath} aria-label="Volver">
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="page-heading truncate">{doc.draft ? "Borrador" : `Factura ${folioLabel(doc)}`}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <StatusBadge status={doc.status} />
              <span className="text-muted-foreground truncate text-sm">{doc.partyName}</span>
            </div>
          </div>
        </div>
        {canUpdate && (
          <div className="flex shrink-0 flex-wrap gap-2">
            {!cancelled && doc.balance > 0 && (
              <Button onClick={() => setPaying(true)}>
                <HandCoins className="size-4" />
                Registrar {labels.payment.toLowerCase()}
              </Button>
            )}
            {cancelled ? (
              <Button variant="outline" disabled={busy} onClick={() => patch({ reactivate: true }, "Factura reactivada.")}>
                <RotateCcw className="size-4" />
                Reactivar
              </Button>
            ) : (
              doc.payments.length === 0 && (
                <Button variant="outline" onClick={() => { setReason(""); setCancelling(true); }}>
                  <Ban className="size-4" />
                  Cancelar factura
                </Button>
              )
            )}
            <Button variant={doc.draft ? "default" : "outline"} asChild>
              <Link href={`${basePath}/${doc.id}/edit`}>
                <Pencil className="size-4" />
                {doc.draft ? (doc.kind === "receivable" ? "Registrar factura emitida" : "Registrar factura recibida") : "Editar"}
              </Link>
            </Button>
          </div>
        )}
      </div>

      {doc.draft && !cancelled && (
        <div className="rounded-lg border border-violet-500/40 bg-violet-500/5 p-4 text-sm">
          <p className="font-medium">Todavía no es factura</p>
          <p className="text-muted-foreground">
            {doc.kind === "receivable"
              ? "Se armó desde el embarque. Emite la factura y registra aquí su folio: hasta entonces no cuenta en el saldo por cobrar."
              : "Se armó desde el embarque. Cuando el transportista mande su factura, registra aquí su folio: hasta entonces no cuenta en el saldo por pagar."}
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Datos de la factura</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <InfoRow label={labels.party} value={doc.partyName} />
            <InfoRow label="RFC" value={doc.partyRfc} />
            <InfoRow label="Folio fiscal (UUID)" value={doc.uuid} />
            <InfoRow label="Fecha" value={shortDay(doc.issueDate)} />
            <InfoRow label="Vence" value={shortDay(doc.dueDate)} />
            <InfoRow label="Método de pago" value={doc.paymentMethod === "PUE" ? "PUE · Una sola exhibición" : "PPD · Parcialidades o diferido"} />
            <InfoRow label="Concepto" value={doc.concept} />
            <InfoRow label="Referencia" value={doc.reference} />
            {doc.shipmentId && (
              <InfoRow
                label="Embarque"
                value={
                  <Link href={`${shipmentsHref}/${doc.shipmentId}`} className="text-primary hover:underline">
                    {doc.shipmentEco ? `ECO ${doc.shipmentEco}` : "Ver embarque"}
                  </Link>
                }
              />
            )}
            <InfoRow
              label="Origen"
              value={doc.source === "alegra" ? "Capturada desde Alegra" : doc.source === "shipment" ? "Armada desde el embarque" : "Capturada en la plataforma"}
            />
            {cancelled && <InfoRow label="Motivo de cancelación" value={doc.cancelReason} />}
            {doc.notes && <InfoRow label="Notas" value={doc.notes} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Importes</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <InfoRow label="Subtotal" value={money(doc.subtotal, doc.currency)} />
            <InfoRow label={`IVA ${Math.round(doc.ivaRate * 100)} %`} value={money(doc.iva, doc.currency)} />
            {doc.ivaWithheld > 0 && <InfoRow label="Retención de IVA" value={`-${money(doc.ivaWithheld, doc.currency)}`} />}
            {doc.isrWithheld > 0 && <InfoRow label="Retención de ISR" value={`-${money(doc.isrWithheld, doc.currency)}`} />}
            <InfoRow label="Total" value={money(doc.total, doc.currency)} />
            {doc.currency === "USD" && <InfoRow label="Tipo de cambio" value={`${doc.exchangeRate} pesos por dólar`} />}
            {!doc.draft && (
              <>
                <InfoRow label={doc.kind === "receivable" ? "Cobrado" : "Pagado"} value={money(doc.paid, doc.currency)} />
                <InfoRow label="Saldo" value={money(doc.balance, doc.currency)} />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <AttachmentsCard doc={doc} canUpdate={canUpdate && !cancelled} onChanged={load} />

      {doc.cartaPorte && (
        <CartaPorteCard documentId={doc.id} data={doc.cartaPorte} canRefresh={canUpdate && doc.draft && !cancelled} onRefreshed={load} />
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{doc.kind === "receivable" ? "Cobros" : "Pagos"}</CardTitle>
        </CardHeader>
        <CardContent>
          {doc.payments.length === 0 ? (
            <p className="text-muted-foreground text-sm">Todavía no hay {doc.kind === "receivable" ? "cobros" : "pagos"} registrados.</p>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-max text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 pr-4 text-left font-medium">Fecha</th>
                    <th className="py-2 pr-4 text-right font-medium">Monto</th>
                    <th className="py-2 pr-4 text-left font-medium">Cuenta</th>
                    <th className="py-2 pr-4 text-left font-medium">Forma</th>
                    <th className="py-2 pr-4 text-left font-medium">Referencia</th>
                    {canDelete && <th className="w-10" />}
                  </tr>
                </thead>
                <tbody>
                  {doc.payments.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 whitespace-nowrap">{shortDay(p.paidOn)}</td>
                      <td className="py-2 pr-4 text-right whitespace-nowrap tabular-nums">
                        {money(p.amount, doc.currency)}
                        {p.bankAccountCurrency !== doc.currency && (
                          <span className="text-muted-foreground block text-xs">{money(p.bankAmount, p.bankAccountCurrency)} a {p.exchangeRate}</span>
                        )}
                      </td>
                      <td className="py-2 pr-4">{p.bankAccountName}</td>
                      <td className="text-muted-foreground py-2 pr-4">{p.paymentForm ? FORM_LABEL[p.paymentForm] ?? p.paymentForm : "—"}</td>
                      <td className="text-muted-foreground py-2 pr-4">
                        {p.reference ?? "—"}
                        {p.batch && (
                          <span className="block text-xs">
                            Transferencia de {money(p.batch.bankAmount, p.bankAccountCurrency)} que pagó {p.batch.count} facturas
                          </span>
                        )}
                      </td>
                      {canDelete && (
                        <td className="py-2">
                          <Button variant="ghost" size="icon" className="size-7" aria-label="Borrar pago" onClick={() => setRemoving(p)}>
                            <Trash2 className="text-destructive size-3.5" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <PaymentDialog
        doc={paying ? doc : null}
        accounts={accounts ?? []}
        onClose={() => setPaying(false)}
        onSaved={() => {
          setPaying(false);
          load();
          router.refresh();
        }}
      />

      <Dialog open={cancelling} onOpenChange={(o) => !o && setCancelling(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancelar factura {folioLabel(doc)}</DialogTitle>
            <DialogDescription>Queda en la lista como cancelada y deja de contar en el saldo. Se puede reactivar.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Por qué se cancela</Label>
            <Textarea id="cancel-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
            <p className="text-muted-foreground text-xs">Error en el RFC, se sustituyó por otra factura, el cliente no aceptó…</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelling(false)}>Volver</Button>
            <Button onClick={() => patch({ cancel: true, cancelReason: reason.trim() }, "Factura cancelada.")} disabled={busy || reason.trim().length < 3}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Cancelar factura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={removing !== null} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{removing?.batch ? "¿Borrar la transferencia completa?" : "¿Borrar este pago?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {removing?.batch
                ? `Este pago fue parte de una transferencia que pagó ${removing.batch.count} facturas. Se borra la transferencia completa: el pago de cada factura y su movimiento en el banco.`
                : "Se quita de la factura y también su movimiento en el banco."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction onClick={() => removing && removePayment(removing.id)}>Borrar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
