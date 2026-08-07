"use client";

import { useCallback, useEffect, useState } from "react";
import { Mail, Send, Loader2, Check, X, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTableSkeleton } from "@/components/ui/skeletons";

interface PreviewItem {
  id: string;
  label: string;
  description: string;
  group: string;
}

interface PreviewDetail {
  id: string;
  label: string;
  subject: string;
  html: string | null;
  text: string;
}

interface SendResult {
  id: string;
  label: string;
  ok: boolean;
  error?: string;
}

export function EmailDemos() {
  const [items, setItems] = useState<PreviewItem[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [to, setTo] = useState("");
  const [detail, setDetail] = useState<PreviewDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [results, setResults] = useState<SendResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/email-demos")
      .then((r) => (r.ok ? r.json() : []))
      .then(setItems)
      .catch(() => setItems([]));

    // El destinatario arranca en el correo del propio admin: es lo que va a
    // querer el 90% de las veces.
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((me: { email?: string } | null) => {
        if (me?.email) setTo(me.email);
      })
      .catch(() => {});
  }, []);

  const showPreview = useCallback(async (id: string) => {
    setIsLoadingDetail(true);
    try {
      const res = await fetch(`/api/admin/email-demos?id=${id}`);
      setDetail(res.ok ? await res.json() : null);
    } catch {
      setDetail(null);
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (!items) return;
    setSelected((prev) => (prev.size === items.length ? new Set() : new Set(items.map((i) => i.id))));
  }

  async function handleSend() {
    setError(null);
    setResults(null);
    if (selected.size === 0) {
      setError("Elige al menos un correo.");
      return;
    }
    setIsSending(true);
    try {
      const res = await fetch("/api/admin/email-demos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, ids: [...selected] }),
      });
      const data = await res.json() as { error?: string; results?: SendResult[] };
      if (!res.ok) {
        setError(data.error ?? "No se pudieron mandar los correos.");
        return;
      }
      setResults(data.results ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de conexión.");
    } finally {
      setIsSending(false);
    }
  }

  if (!items) return <DataTableSkeleton />;

  const groups = [...new Set(items.map((i) => i.group))];
  const failed = results?.filter((r) => !r.ok) ?? [];
  const sent = results?.filter((r) => r.ok) ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* ── Selección y envío ── */}
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Enviar a
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="demo-to">Correo de destino</Label>
              <Input
                id="demo-to"
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="text-email"
              />
              <p className="text-xs text-muted-foreground">
                Los correos salen con <strong>[DEMO]</strong> en el asunto y datos
                inventados. No se le manda nada a nadie más.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={handleSend} disabled={isSending || selected.size === 0}>
                {isSending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                Enviar {selected.size > 0 ? `(${selected.size})` : ""}
              </Button>
              <Button variant="outline" size="sm" onClick={toggleAll}>
                {selected.size === items.length ? "Quitar todos" : "Elegir todos"}
              </Button>
            </div>

            {error && <p className="text-sm font-medium text-destructive">{error}</p>}

            {results && (
              <div className="space-y-2 rounded-lg border p-3">
                <p className="text-sm font-semibold">
                  {sent.length} de {results.length} enviados
                </p>
                {failed.length > 0 && (
                  <ul className="space-y-1">
                    {failed.map((r) => (
                      <li key={r.id} className="flex items-start gap-2 text-xs text-destructive">
                        <X className="mt-0.5 size-3 shrink-0" />
                        <span>
                          <strong>{r.label}:</strong> {r.error}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {sent.length > 0 && failed.length === 0 && (
                  <p className="flex items-center gap-2 text-xs text-green-600">
                    <Check className="size-3" />
                    Revisa la bandeja de {to}.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {groups.map((group) => (
          <Card key={group}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {group}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 px-2 pb-2">
              {items
                .filter((i) => i.group === group)
                .map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 rounded-lg p-2 transition hover:bg-muted/50"
                  >
                    <Checkbox
                      id={`demo-${item.id}`}
                      checked={selected.has(item.id)}
                      onCheckedChange={() => toggle(item.id)}
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <Label htmlFor={`demo-${item.id}`} className="cursor-pointer text-sm font-medium">
                        {item.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => showPreview(item.id)}
                      aria-label={`Ver ${item.label}`}
                    >
                      <Eye className="size-4" />
                    </Button>
                  </div>
                ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Vista previa ── */}
      <Card className="lg:sticky lg:top-6 lg:self-start">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Vista previa
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingDetail ? (
            <DataTableSkeleton />
          ) : !detail ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <Mail className="size-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                Elige el ojo de un correo para verlo aquí.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Asunto
                </p>
                <p className="text-sm font-semibold">[DEMO] {detail.subject}</p>
              </div>
              {detail.html ? (
                // El correo se pinta aislado: sus estilos en línea no deben
                // mezclarse con los de la aplicación.
                <iframe
                  title={`Vista previa de ${detail.label}`}
                  srcDoc={detail.html}
                  sandbox=""
                  className="h-[600px] w-full rounded-lg border bg-white"
                />
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Este correo se manda solo como texto, sin maquetar.
                  </p>
                  <pre className="max-h-[600px] overflow-auto rounded-lg border bg-muted/40 p-3 text-xs normal-case tracking-normal whitespace-pre-wrap">
                    {detail.text}
                  </pre>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
