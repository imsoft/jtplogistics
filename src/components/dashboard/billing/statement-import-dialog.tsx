"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { parseCsv, parseStatementRows, type Cell, type PlatformMovement, type StatementLine } from "@/lib/bank-statement";
import type { Currency } from "@/lib/billing";
import { money, shortDay } from "./billing-shared";

interface Preview {
  from: string;
  to: string;
  lines: StatementLine[];
  matches: { line: number; movementId: string; alreadyReconciled: boolean; dayGap: number; movement: PlatformMovement }[];
  unmatchedLines: number[];
  unmatchedMovements: PlatformMovement[];
}

/** Lee el archivo en el navegador: CSV (UTF-8 o Latin-1, como lo bajan los bancos) o Excel. */
async function readFile(file: File): Promise<Cell[][]> {
  if (/\.xlsx$/i.test(file.name)) {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await file.arrayBuffer());
    const sheet = wb.worksheets[0];
    if (!sheet) return [];
    const rows: Cell[][] = [];
    sheet.eachRow({ includeEmpty: false }, (row) => {
      const values = (row.values as unknown[]).slice(1).map((v): Cell => {
        if (v === null || v === undefined) return null;
        if (v instanceof Date || typeof v === "number" || typeof v === "string") return v;
        const o = v as { result?: unknown; text?: unknown; richText?: { text: string }[] };
        if (o.richText) return o.richText.map((t) => t.text).join("");
        if (o.result !== undefined) return o.result as Cell;
        if (o.text !== undefined) return String(o.text);
        return String(v);
      });
      rows.push(values);
    });
    return rows;
  }
  const buffer = await file.arrayBuffer();
  let text = new TextDecoder("utf-8").decode(buffer);
  if (text.includes("�")) text = new TextDecoder("windows-1252").decode(buffer);
  return parseCsv(text);
}

/**
 * Importar el estado de cuenta del banco: empata cada renglón con los
 * movimientos de la plataforma y deja conciliado lo que coincide. Lo que está
 * en el banco y no en la plataforma (comisiones, intereses…) se puede dar de
 * alta desde aquí.
 */
export function StatementImportDialog({
  open,
  accountId,
  currency,
  canCreate,
  onClose,
  onApplied,
}: {
  open: boolean;
  accountId: string;
  currency: Currency;
  canCreate: boolean;
  onClose: () => void;
  onApplied: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        {open && <ImportForm accountId={accountId} currency={currency} canCreate={canCreate} onClose={onClose} onApplied={onApplied} />}
      </DialogContent>
    </Dialog>
  );
}

function ImportForm({ accountId, currency, canCreate, onClose, onApplied }: { accountId: string; currency: Currency; canCreate: boolean; onClose: () => void; onApplied: () => void }) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [reconcile, setReconcile] = useState<Set<string>>(new Set());
  const [create, setCreate] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setReading(true);
    setPreview(null);
    setFileName(file.name);
    try {
      const parsed = parseStatementRows(await readFile(file));
      if (!parsed.ok) throw new Error(parsed.error);
      const res = await fetch(`/api/billing/banks/${accountId}/statement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines: parsed.lines }),
      });
      const d = (await res.json().catch(() => ({}))) as Preview & { error?: string };
      if (!res.ok) throw new Error(d.error ?? "No se pudo leer el estado de cuenta.");
      setPreview(d);
      setReconcile(new Set(d.matches.filter((m) => !m.alreadyReconciled).map((m) => m.movementId)));
      setCreate(new Set());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo leer el archivo.");
      setFileName(null);
    } finally {
      setReading(false);
    }
  }

  async function apply() {
    if (!preview) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/billing/banks/${accountId}/statement/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reconcile: [...reconcile], create: [...create].map((i) => preview.lines[i]) }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string; reconciled?: number; created?: number };
      if (!res.ok) throw new Error(d.error ?? "No se pudo aplicar.");
      toast.success(`${d.reconciled ?? 0} conciliados${d.created ? ` y ${d.created} dados de alta` : ""}.`);
      onApplied();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo aplicar.");
    } finally {
      setBusy(false);
    }
  }

  const toggle = <T,>(set: Set<T>, value: T, update: (s: Set<T>) => void) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    update(next);
  };

  const pending = preview?.matches.filter((m) => !m.alreadyReconciled) ?? [];
  const already = preview ? preview.matches.length - pending.length : 0;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Importar estado de cuenta</DialogTitle>
        <DialogDescription>
          Sube el archivo que bajas de la banca en línea (CSV o Excel .xlsx). Se empata cada renglón con los movimientos de aquí por importe y fecha.
        </DialogDescription>
      </DialogHeader>

      <div className="max-h-[65vh] space-y-5 overflow-y-auto px-1">
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" disabled={reading} asChild>
            <label className="cursor-pointer">
              {reading ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}
              {fileName ? "Elegir otro archivo" : "Elegir archivo"}
              <input
                type="file"
                accept=".csv,.txt,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="sr-only"
                disabled={reading}
                onChange={(e) => {
                  void onFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
          </Button>
          {fileName && <span className="text-muted-foreground truncate text-sm">{fileName}</span>}
        </div>

        {preview && (
          <>
            <p className="text-sm">
              {preview.lines.length} movimientos del banco, del {shortDay(preview.from)} al {shortDay(preview.to)}.
              {already > 0 && <span className="text-muted-foreground"> {already} ya estaban conciliados.</span>}
            </p>

            <Section title={`Coinciden con la plataforma (${pending.length})`} hint="Se marcan como conciliados.">
              {pending.length === 0 ? (
                <Empty>Nada nuevo por conciliar.</Empty>
              ) : (
                pending.map((m) => {
                  const l = preview.lines[m.line];
                  return (
                    <Row
                      key={m.movementId}
                      checked={reconcile.has(m.movementId)}
                      onToggle={() => toggle(reconcile, m.movementId, setReconcile)}
                      date={l.date}
                      amount={l.amount}
                      currency={currency}
                      title={m.movement.concept}
                      detail={`Banco: ${l.description}${m.dayGap ? ` · ${m.dayGap} día${m.dayGap === 1 ? "" : "s"} de diferencia` : ""}`}
                    />
                  );
                })
              )}
            </Section>

            <Section
              title={`En el banco pero no en la plataforma (${preview.unmatchedLines.length})`}
              hint={canCreate ? "Comisiones, intereses o depósitos sin registrar. Marca los que quieras dar de alta (quedan conciliados)." : "Pide a quien tenga permiso de alta que los registre."}
            >
              {preview.unmatchedLines.length === 0 ? (
                <Empty>Todo lo del banco está en la plataforma.</Empty>
              ) : (
                preview.unmatchedLines.map((i) => {
                  const l = preview.lines[i];
                  return (
                    <Row
                      key={i}
                      checked={create.has(i)}
                      disabled={!canCreate}
                      onToggle={() => toggle(create, i, setCreate)}
                      date={l.date}
                      amount={l.amount}
                      currency={currency}
                      title={l.description}
                      detail={l.reference ? `Ref. ${l.reference}` : undefined}
                    />
                  );
                })
              )}
            </Section>

            <Section
              title={`En la plataforma pero no en el banco (${preview.unmatchedMovements.length})`}
              hint="Sin conciliar y dentro de esas fechas: revisa si el cobro o pago se registró con otro monto, en otra cuenta o si todavía no se refleja."
            >
              {preview.unmatchedMovements.length === 0 ? (
                <Empty>Ninguno.</Empty>
              ) : (
                preview.unmatchedMovements.map((m) => (
                  <Row key={m.id} date={m.date} amount={m.amount} currency={currency} title={m.concept} detail={m.reference ? `Ref. ${m.reference}` : undefined} />
                ))
              )}
            </Section>
          </>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={apply} disabled={busy || !preview || (reconcile.size === 0 && create.size === 0)}>
          {busy && <Loader2 className="size-4 animate-spin" />}
          Conciliar {reconcile.size}
          {create.size > 0 && ` y dar de alta ${create.size}`}
        </Button>
      </DialogFooter>
    </>
  );
}

function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-muted-foreground text-xs">{hint}</p>
      </div>
      <div className="divide-y rounded-md border">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground px-3 py-2 text-sm">{children}</p>;
}

function Row({
  checked,
  disabled,
  onToggle,
  date,
  amount,
  currency,
  title,
  detail,
}: {
  checked?: boolean;
  disabled?: boolean;
  onToggle?: () => void;
  date: string;
  amount: number;
  currency: Currency;
  title: string;
  detail?: string;
}) {
  return (
    <label className={cn("flex items-start gap-3 px-3 py-2 text-sm", onToggle && !disabled && "hover:bg-muted/40 cursor-pointer")}>
      {onToggle && <input type="checkbox" checked={checked} disabled={disabled} onChange={onToggle} className="accent-primary mt-0.5 size-4 shrink-0" />}
      <span className="text-muted-foreground w-16 shrink-0 whitespace-nowrap">{shortDay(date)}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate" title={title}>{title}</span>
        {detail && <span className="text-muted-foreground block truncate text-xs" title={detail}>{detail}</span>}
      </span>
      <span className={cn("shrink-0 whitespace-nowrap tabular-nums", amount < 0 ? "text-destructive" : "text-green-700")}>{money(amount, currency)}</span>
    </label>
  );
}
