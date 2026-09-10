"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Loader2, Send, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ROLE_LABELS: Record<string, string> = {
  collaborator: "Colaborador",
  admin: "Dirección",
  vendor: "Vendedor",
  developer: "Soporte TI",
};

interface Person {
  id: string;
  name: string;
  email: string;
  role: string;
  position: string | null;
}

interface Result {
  id: string;
  name: string;
  email: string;
  sent: boolean;
  password: string | null;
  error: string | null;
}

export default function BulkCredentialsPage() {
  const [people, setPeople] = useState<Person[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [results, setResults] = useState<Result[] | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/employees/bulk-credentials")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { users: Person[] }) => {
        setPeople(d.users);
        setSelected(new Set(d.users.filter((u) => u.role === "collaborator").map((u) => u.id)));
      })
      .catch(() => setPeople([]));
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function send() {
    setIsSending(true);
    try {
      const res = await fetch("/api/employees/bulk-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: [...selected] }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        results?: Result[];
        sent?: number;
        total?: number;
        error?: string;
      };
      if (!res.ok || !data.results) {
        toast.error(data.error ?? "No se pudo mandar.");
        return;
      }
      setResults(data.results);
      setConfirming(false);
      toast.success(`${data.sent} de ${data.total} recibieron su acceso nuevo.`);
    } catch {
      toast.error("Error de conexión.");
    } finally {
      setIsSending(false);
    }
  }

  async function copy(password: string) {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(password);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("No se pudo copiar.");
    }
  }

  if (people === null) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  const failed = results?.filter((r) => !r.sent) ?? [];

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="page-heading">Mandar accesos</h1>
        <p className="text-muted-foreground text-sm">
          Le manda a cada quien su correo de acceso y una contraseña nueva.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-2 py-4 text-sm">
          <p className="flex items-start gap-2 font-medium">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
            Lo que va a pasar
          </p>
          <ul className="text-muted-foreground ml-6 list-disc space-y-1">
            <li>
              A cada persona se le asigna una contraseña <strong>distinta</strong>, generada al
              azar y fácil de dictar por teléfono.
            </li>
            <li>Su contraseña anterior deja de funcionar y se le cierran las sesiones abiertas.</li>
            <li>Quien no lea su correo, no va a poder entrar.</li>
            <li>
              No se puede mandar la contraseña que ya tenían: el sistema las guarda cifradas de
              una sola vía y nadie puede leerlas.
            </li>
          </ul>
          <p className="text-muted-foreground">
            Tu propia cuenta no aparece en la lista: cerrarte la sesión a media operación te
            dejaría fuera sin nadie que lo arregle.
          </p>
        </CardContent>
      </Card>

      {results ? (
        <div className="space-y-3">
          <h2 className="text-base font-semibold">Resultado</h2>
          {failed.length > 0 && (
            <Card>
              <CardContent className="space-y-3 py-4">
                <p className="text-destructive text-sm font-medium">
                  A estas personas ya se les cambió la contraseña, pero el correo no salió.
                  Entrégasela por otro medio o no van a poder entrar.
                </p>
                {failed.map((r) => (
                  <div key={r.id} className="rounded-lg border p-3">
                    <p className="font-medium">{r.name}</p>
                    <p className="text-muted-foreground text-xs lowercase">{r.email}</p>
                    {r.password && (
                      <div className="mt-2 flex items-center gap-2">
                        <code className="flex-1 break-all text-base font-bold">{r.password}</code>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Copiar contraseña"
                          onClick={() => copy(r.password!)}
                        >
                          {copied === r.password ? (
                            <Check className="size-4 text-green-600" />
                          ) : (
                            <Copy className="size-4" />
                          )}
                        </Button>
                      </div>
                    )}
                    {r.error && <p className="text-muted-foreground mt-1 text-xs">{r.error}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          <div className="rounded-lg border">
            {results
              .filter((r) => r.sent)
              .map((r) => (
                <div key={r.id} className="flex items-center gap-2 border-b px-4 py-2.5 text-sm last:border-0">
                  <Check className="size-4 shrink-0 text-green-600" />
                  <span className="font-medium">{r.name}</span>
                  <span className="text-muted-foreground lowercase">{r.email}</span>
                </div>
              ))}
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-lg border">
            {people.map((p) => (
              <div key={p.id} className="flex items-center gap-3 border-b px-4 py-3 last:border-0">
                <Checkbox
                  id={`u-${p.id}`}
                  checked={selected.has(p.id)}
                  onCheckedChange={() => toggle(p.id)}
                />
                <Label htmlFor={`u-${p.id}`} className="flex min-w-0 flex-1 flex-col gap-0.5 font-normal">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-muted-foreground text-xs lowercase">{p.email}</span>
                </Label>
                <span className="text-muted-foreground shrink-0 text-xs">
                  {ROLE_LABELS[p.role] ?? p.role}
                </span>
              </div>
            ))}
          </div>

          <Button disabled={selected.size === 0} onClick={() => setConfirming(true)}>
            <Send className="size-4" />
            Mandar accesos a {selected.size}{" "}
            {selected.size === 1 ? "persona" : "personas"}
          </Button>
        </>
      )}

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Mandar los accesos?</DialogTitle>
            <DialogDescription>
              A {selected.size} {selected.size === 1 ? "persona" : "personas"} se les cambia la
              contraseña ahora mismo y se les cierran las sesiones. No se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)}>
              Cancelar
            </Button>
            <Button onClick={send} disabled={isSending}>
              {isSending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              {isSending ? "Mandando…" : "Sí, mandar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
