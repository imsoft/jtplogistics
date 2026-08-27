"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  blobToBase64,
  buildQuotePdf,
  type StoredQuote,
} from "@/components/dashboard/quotes/build-quote-pdf";

interface SendResult {
  to: string;
  fellBack: boolean;
  replyTo: string;
}

/**
 * Manda por correo una cotización YA GUARDADA, con su PDF actual adjunto.
 *
 * Es independiente de crearla: se puede mandar el mismo día, una semana después
 * o volver a mandarla tras editarla. El PDF se rearma al abrir el diálogo, así
 * que siempre sale con la información vigente.
 */
export function QuoteSendButton({
  id,
  quoteNumber,
  apiEndpoint = "/api/admin/generated-quotes",
  variant = "full",
}: {
  id: string;
  quoteNumber: string;
  apiEndpoint?: string;
  /** "icon" para la fila del listado; "full" para la ficha. */
  variant?: "icon" | "full";
}) {
  const [open, setOpen] = useState(false);
  const [quote, setQuote] = useState<StoredQuote | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  const [isPreparing, setIsPreparing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SendResult | null>(null);

  async function handleOpen() {
    setIsPreparing(true);
    setError(null);
    setResult(null);
    try {
      const { quote: loaded, blob } = await buildQuotePdf({ id, apiEndpoint });
      setQuote(loaded);
      setPdfBase64(await blobToBase64(blob));
      // El correo del contacto ya viene en la cotización; si no lo capturaron,
      // se escribe aquí.
      setTo(loaded.email ?? "");
      setOpen(true);
    } catch (e) {
      console.error(e);
      toast.error("No se pudo preparar el PDF de la cotización.");
    } finally {
      setIsPreparing(false);
    }
  }

  async function handleSend() {
    if (!quote || !pdfBase64) return;
    if (!to.trim()) {
      setError("Escribe el correo de quien va a recibir la cotización.");
      return;
    }
    setError(null);
    setIsSending(true);
    try {
      const res = await fetch("/api/generated-quotes/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteNumber: quote.quoteNumber,
          company: quote.company,
          contact: quote.contact,
          validUntil: quote.validUntil,
          to: to.trim(),
          message: message.trim() || null,
          pdfBase64,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        to?: string;
        fellBack?: boolean;
        replyTo?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "No se pudo enviar la cotización.");
        return;
      }
      setResult({
        to: data.to ?? to.trim(),
        fellBack: !!data.fellBack,
        replyTo: data.replyTo ?? "",
      });
      setMessage("");
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "No se pudo enviar la cotización.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <>
      {variant === "icon" ? (
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={handleOpen}
          disabled={isPreparing}
          aria-label={`Enviar por correo la cotización ${quoteNumber}`}
          title="Enviar por correo"
        >
          {isPreparing ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
        </Button>
      ) : (
        <Button variant="outline" size="sm" onClick={handleOpen} disabled={isPreparing} className="gap-2">
          {isPreparing ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
          {isPreparing ? "Preparando…" : "Enviar por correo"}
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Enviar cotización {quote?.quoteNumber ?? quoteNumber}</DialogTitle>
            <DialogDescription>
              Sale desde tu correo, con el PDF adjunto. Si el cliente responde, te
              contesta a ti.
            </DialogDescription>
          </DialogHeader>

          {result ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-green-600">
                Cotización enviada a {result.to}.
              </p>
              {result.fellBack && (
                <p className="text-xs text-muted-foreground">
                  Salió desde el correo de la plataforma porque el dominio de tu
                  cuenta no está dado de alta en Resend. Las respuestas llegan a{" "}
                  {result.replyTo}.
                </p>
              )}
              <DialogFooter>
                <Button onClick={() => setOpen(false)}>Listo</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor={`send-to-${id}`}>Correo del cliente</Label>
                <Input
                  id={`send-to-${id}`}
                  type="email"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="text-email"
                />
                {!quote?.email && (
                  <p className="text-xs text-muted-foreground">
                    Esta cotización no tiene correo capturado; escríbelo aquí.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor={`send-msg-${id}`}>Mensaje</Label>
                <Textarea
                  id={`send-msg-${id}`}
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Opcional. Se agrega al correo, antes de los datos de la cotización.
                </p>
              </div>

              {error && <p className="text-sm font-medium text-destructive">{error}</p>}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSend} disabled={isSending}>
                  {isSending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  {isSending ? "Enviando…" : "Enviar"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
