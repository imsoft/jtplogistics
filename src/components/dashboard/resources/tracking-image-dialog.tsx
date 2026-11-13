"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface TrackingPreview {
  /** Object URL del PNG ya generado. */
  url: string;
  blob: Blob;
  fileName: string;
  eco: string | null;
}

/**
 * Vista previa de la imagen de seguimiento antes de descargarla. También la
 * copia al portapapeles para pegarla directo en WhatsApp Web.
 */
export function TrackingImageDialog({ preview, onClose }: { preview: TrackingPreview | null; onClose: () => void }) {
  const [copying, setCopying] = useState(false);
  const canCopy = typeof window !== "undefined" && "ClipboardItem" in window && Boolean(navigator.clipboard?.write);

  function download() {
    if (!preview) return;
    const a = document.createElement("a");
    a.href = preview.url;
    a.download = preview.fileName;
    a.click();
  }

  async function copy() {
    if (!preview) return;
    setCopying(true);
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": preview.blob })]);
      toast.success("Imagen copiada: pégala en WhatsApp.");
    } catch {
      toast.error("No se pudo copiar; descárgala.");
    } finally {
      setCopying(false);
    }
  }

  return (
    <Dialog open={preview !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Imagen de seguimiento{preview?.eco ? ` · ${preview.eco}` : ""}</DialogTitle>
          <DialogDescription>Revísala antes de mandarla al cliente.</DialogDescription>
        </DialogHeader>
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element -- es un blob local, no pasa por next/image
          <img src={preview.url} alt={`Seguimiento del embarque ${preview.eco ?? ""}`} className="aspect-square w-full rounded-lg border" />
        )}
        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row">
            {canCopy && (
              <Button type="button" variant="outline" onClick={copy} disabled={copying}>
                <Copy className="size-4" />
                Copiar imagen
              </Button>
            )}
            <Button type="button" onClick={download}>
              <Download className="size-4" />
              Descargar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
