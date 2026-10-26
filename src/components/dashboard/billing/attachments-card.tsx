"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download, FileText, Loader2, Paperclip, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { attachmentHref, uploadAttachment, type BillingDocument } from "./billing-shared";

const kb = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

/**
 * El PDF y el XML de la factura. Subir el XML a una factura capturada a mano
 * (o a un borrador) la completa con el folio, el folio fiscal y los importes.
 */
export function AttachmentsCard({ doc, canUpdate, onChanged }: { doc: BillingDocument; canUpdate: boolean; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<{ id: string; fileName: string; kind: string } | null>(null);
  const hasXml = doc.attachments.some((a) => a.kind === "xml");

  async function onFiles(list: FileList | null) {
    if (!list?.length) return;
    setBusy(true);
    try {
      for (const file of Array.from(list)) {
        const up = await uploadAttachment(file, doc.kind, doc.id);
        toast.success(up.fields ? "XML adjunto: la factura tomó su folio, folio fiscal e importes." : "PDF adjunto.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo subir el archivo.");
    } finally {
      setBusy(false);
      onChanged();
    }
  }

  async function remove() {
    if (!removing) return;
    const res = await fetch(`/api/billing/attachments/${removing.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("No se pudo quitar el archivo.");
      return;
    }
    toast.success("Archivo quitado.");
    setRemoving(null);
    onChanged();
  }

  return (
    <Card>
      <CardHeader className="flex flex-col items-start justify-between gap-3 space-y-0 pb-2 sm:flex-row">
        <CardTitle className="text-base">Archivos</CardTitle>
        {canUpdate && (
          <Button size="sm" variant="outline" disabled={busy} asChild>
            <label className="cursor-pointer">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
              {hasXml ? "Subir PDF" : "Subir XML o PDF"}
              <input
                type="file"
                accept={hasXml ? ".pdf,application/pdf" : ".xml,.pdf,application/xml,text/xml,application/pdf"}
                multiple
                className="sr-only"
                disabled={busy}
                onChange={(e) => {
                  void onFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {doc.attachments.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Sin archivos.{canUpdate && " Sube el XML y la factura se completa sola con su folio fiscal e importes."}
          </p>
        ) : (
          <ul className="divide-y">
            {doc.attachments.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <FileText className="text-muted-foreground size-4 shrink-0" />
                  <span className="truncate" title={a.fileName}>{a.fileName}</span>
                  <span className="text-muted-foreground shrink-0 text-xs uppercase">{a.kind} · {kb(a.size)}</span>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button variant="ghost" size="icon" className="size-7" asChild>
                    <a href={attachmentHref(a.id)} target={a.kind === "pdf" ? "_blank" : undefined} rel="noreferrer" aria-label={`Descargar ${a.fileName}`}>
                      <Download className="size-3.5" />
                    </a>
                  </Button>
                  {canUpdate && (
                    <Button variant="ghost" size="icon" className="text-destructive size-7" aria-label={`Quitar ${a.fileName}`} onClick={() => setRemoving(a)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <DeleteConfirmDialog
        open={removing !== null}
        onOpenChange={(o) => !o && setRemoving(null)}
        title="Quitar archivo"
        description={
          removing?.kind === "xml"
            ? `Se quita ${removing.fileName}. La factura conserva los importes que tomó del XML y se pueden volver a editar a mano.`
            : `Se quita ${removing?.fileName ?? ""} de la factura.`
        }
        onConfirm={remove}
      />
    </Card>
  );
}
