"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { FileMinus, Loader2, Paperclip, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppSelect } from "@/components/ui/app-select";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatMxnLive, parseMxn } from "@/lib/utils";
import { IVA_WITHHOLDING_OPTIONS, computeTotals } from "@/lib/billing";
import { money, shortDay, todayKey, uploadAttachment, type BillingAttachmentRow, type BillingDocument, type UploadedAttachment } from "./billing-shared";
import { DatePicker } from "@/components/ui/date-picker";

const IVA_OPTIONS = [
  { value: "0.16", label: "16 %" },
  { value: "0.08", label: "8 % (región fronteriza)" },
  { value: "0", label: "0 % / exento" },
];

const noteFolio = (n: { series: string | null; folio: string | null }) => (n.folio ? [n.series, n.folio].filter(Boolean).join("-") : "Sin folio");

/**
 * Notas de crédito de la factura: descuentos, devoluciones o bonificaciones.
 * Bajan el saldo sin mover el banco.
 */
export function CreditNotesCard({
  doc,
  canUpdate,
  canDelete,
  onChanged,
}: {
  doc: BillingDocument;
  canUpdate: boolean;
  canDelete: boolean;
  onChanged: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<BillingDocument["creditNotes"][number] | null>(null);
  const canAdd = canUpdate && !doc.draft && doc.status !== "cancelada" && doc.balance > 0;

  async function remove() {
    if (!removing) return;
    const res = await fetch(`/api/billing/credit-notes/${removing.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("No se pudo borrar la nota de crédito.");
      return;
    }
    toast.success("Nota de crédito borrada: la factura recuperó su saldo.");
    setRemoving(null);
    onChanged();
  }

  if (doc.creditNotes.length === 0 && !canAdd) return null;

  return (
    <Card>
      <CardHeader className="flex flex-col items-start justify-between gap-3 space-y-0 pb-2 sm:flex-row">
        <CardTitle className="text-base">Notas de crédito</CardTitle>
        {canAdd && (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            <FileMinus className="size-4" />
            Registrar nota de crédito
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {doc.creditNotes.length === 0 ? (
          <p className="text-muted-foreground text-sm">Ninguna. Una nota de crédito baja el saldo sin mover el banco (descuento, devolución, bonificación).</p>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-max text-sm md:min-w-0">
              <thead>
                <tr className="border-b">
                  <th className="py-2 pr-4 text-left font-medium">Fecha</th>
                  <th className="py-2 pr-4 text-left font-medium">Folio</th>
                  <th className="py-2 pr-4 text-left font-medium">Motivo</th>
                  <th className="py-2 pr-4 text-right font-medium">Total</th>
                  {canDelete && <th className="w-10" />}
                </tr>
              </thead>
              <tbody>
                {doc.creditNotes.map((n) => (
                  <tr key={n.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 whitespace-nowrap">{shortDay(n.issueDate)}</td>
                    <td className="py-2 pr-4 font-mono text-xs">
                      {noteFolio(n)}
                      {n.uuid && <span className="text-muted-foreground block">{n.uuid}</span>}
                    </td>
                    <td className="py-2 pr-4">{n.reason}</td>
                    <td className="py-2 pr-4 text-right whitespace-nowrap tabular-nums">-{money(n.total, doc.currency)}</td>
                    {canDelete && (
                      <td className="py-2">
                        <Button variant="ghost" size="icon" className="size-7" aria-label="Borrar nota de crédito" onClick={() => setRemoving(n)}>
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

      <Dialog open={adding} onOpenChange={(o) => !o && setAdding(false)}>
        <DialogContent className="sm:max-w-lg">
          {adding && (
            <CreditNoteForm
              doc={doc}
              onClose={() => setAdding(false)}
              onSaved={() => {
                setAdding(false);
                onChanged();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={removing !== null}
        onOpenChange={(o) => !o && setRemoving(null)}
        title="Borrar nota de crédito"
        description={`Se borra la nota de crédito ${removing ? noteFolio(removing) : ""} y sus archivos. La factura vuelve a tener ese saldo.`}
        onConfirm={remove}
      />
    </Card>
  );
}

function CreditNoteForm({ doc, onClose, onSaved }: { doc: BillingDocument; onClose: () => void; onSaved: () => void }) {
  const withholding = doc.subtotal > 0 ? doc.ivaWithheld / doc.subtotal : 0;
  const closest = IVA_WITHHOLDING_OPTIONS.reduce((best, o) =>
    Math.abs(Number(o.value) - withholding) < Math.abs(Number(best.value) - withholding) ? o : best
  );
  const [issueDate, setIssueDate] = useState(todayKey());
  const [series, setSeries] = useState("");
  const [folio, setFolio] = useState("");
  const [uuid, setUuid] = useState("");
  const [subtotal, setSubtotal] = useState("");
  const [ivaRate, setIvaRate] = useState(String(doc.ivaRate === 0.08 ? "0.08" : doc.ivaRate === 0 ? "0" : "0.16"));
  const [withholdingRate, setWithholdingRate] = useState(closest.value);
  const [reason, setReason] = useState("");
  const [files, setFiles] = useState<BillingAttachmentRow[]>([]);
  const [xml, setXml] = useState<NonNullable<UploadedAttachment["fields"]> | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const container = useRef<HTMLDivElement | null>(null);

  const parsed = parseMxn(subtotal);
  const totals = xml
    ? { subtotal: xml.subtotal, iva: xml.iva, ivaWithheld: xml.ivaWithheld + xml.isrWithheld, total: xml.total }
    : parsed !== undefined
      ? computeTotals({ subtotal: parsed, ivaRate: Number(ivaRate), withholdingRate: Number(withholdingRate) })
      : null;
  const tooMuch = totals !== null && totals.total > doc.balance + 0.01;

  async function onFiles(list: FileList | null) {
    if (!list?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(list)) {
        const up = await uploadAttachment(file, doc.kind, doc.id, "credit_note");
        setFiles((prev) => [...prev, up.attachment]);
        if (up.fields && up.cfdi) {
          setXml(up.fields);
          setIssueDate(up.cfdi.issueDate);
          setSeries(up.fields.series ?? "");
          setFolio(up.fields.folio ?? "");
          setUuid(up.fields.uuid ?? "");
          setReason((r) => r || up.cfdi?.concept || "");
          if (doc.uuid && up.cfdi.related.length > 0 && !up.cfdi.related.includes(doc.uuid)) {
            toast.error("Ojo: el XML está relacionado con otra factura, no con esta.");
          }
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo subir el archivo.");
    } finally {
      setUploading(false);
    }
  }

  async function removeFile(id: string) {
    await fetch(`/api/billing/attachments/${id}`, { method: "DELETE" }).catch(() => null);
    const removed = files.find((f) => f.id === id);
    setFiles((prev) => prev.filter((f) => f.id !== id));
    if (removed?.kind === "xml") setXml(null);
  }

  async function submit() {
    setBusy(true);
    try {
      const res = await fetch(`/api/billing/documents/${doc.id}/credit-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueDate, series, folio, uuid, subtotal, ivaRate, withholdingRate, reason, attachmentIds: files.map((f) => f.id) }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(d.error ?? "No se pudo guardar.");
      toast.success("Nota de crédito registrada.");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Registrar nota de crédito</DialogTitle>
        <DialogDescription>
          Sobre la factura {doc.folio ? [doc.series, doc.folio].filter(Boolean).join("-") : ""} · saldo {money(doc.balance, doc.currency)}. Baja el saldo sin mover el banco.
        </DialogDescription>
      </DialogHeader>
      <div className="max-h-[65vh] space-y-4 overflow-y-auto px-1" ref={container}>
        <div className="space-y-2">
          <Button type="button" variant="outline" size="sm" disabled={uploading} asChild>
            <label className="cursor-pointer">
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
              Subir XML o PDF de la nota
              <input
                type="file"
                accept=".xml,.pdf,application/xml,text/xml,application/pdf"
                multiple
                className="sr-only"
                disabled={uploading}
                onChange={(e) => {
                  void onFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          </Button>
          {files.length > 0 && (
            <ul className="space-y-1 text-sm">
              {files.map((f) => (
                <li key={f.id} className="flex items-center gap-2">
                  <span className="truncate">{f.fileName}</span>
                  <span className="text-muted-foreground text-xs uppercase">{f.kind}</span>
                  <Button type="button" variant="ghost" size="icon" className="size-6" aria-label={`Quitar ${f.fileName}`} onClick={() => removeFile(f.id)}>
                    <X className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-muted-foreground text-xs">Con el XML se llenan solos la fecha, el folio y los importes.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cn-date">Fecha</Label>
            <DatePicker id="cn-date" max={todayKey()} value={issueDate} onChange={(v) => setIssueDate(v)} disabled={Boolean(xml)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="cn-series">Serie</Label>
              <Input id="cn-series" value={series} onChange={(e) => setSeries(e.target.value)} disabled={Boolean(xml)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cn-folio">Folio</Label>
              <Input id="cn-folio" value={folio} onChange={(e) => setFolio(e.target.value)} disabled={Boolean(xml)} />
            </div>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="cn-uuid">Folio fiscal (UUID)</Label>
            <Input id="cn-uuid" value={uuid} onChange={(e) => setUuid(e.target.value)} disabled={Boolean(xml)} />
          </div>
          {!xml && (
            <>
              <div className="space-y-2">
                <Label htmlFor="cn-subtotal">Importe sin IVA</Label>
                <Input id="cn-subtotal" inputMode="decimal" value={subtotal} onChange={(e) => setSubtotal(formatMxnLive(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>IVA</Label>
                <AppSelect value={ivaRate} onValueChange={(v) => setIvaRate(v || "0.16")} options={IVA_OPTIONS} container={container} className="w-full" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Retención de IVA</Label>
                <AppSelect value={withholdingRate} onValueChange={(v) => setWithholdingRate(v || "0")} options={IVA_WITHHOLDING_OPTIONS} container={container} className="w-full" />
                <p className="text-muted-foreground text-xs">La misma que la factura, salvo que la nota diga otra cosa.</p>
              </div>
            </>
          )}
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="cn-reason">Motivo</Label>
            <Input id="cn-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
            <p className="text-muted-foreground text-xs">Descuento por retraso, devolución, bonificación…</p>
          </div>
        </div>

        {totals && (
          <p className={tooMuch ? "text-destructive text-sm" : "text-muted-foreground text-sm"}>
            Baja el saldo en <b>{money(totals.total, doc.currency)}</b>
            {tooMuch && ` — pasa del saldo de la factura (${money(doc.balance, doc.currency)})`}.
          </p>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={submit} disabled={busy || uploading || !totals || totals.total <= 0 || tooMuch || reason.trim().length < 3}>
          {busy && <Loader2 className="size-4 animate-spin" />}
          Guardar nota de crédito
        </Button>
      </DialogFooter>
    </>
  );
}
