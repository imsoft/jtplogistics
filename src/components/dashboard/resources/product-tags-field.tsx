"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Separa "acero, cartón; vidrio" en productos sin repetir (sin distinguir mayúsculas). */
export function splitProducts(text: string, existing: string[] = []): string[] {
  const seen = new Set(existing.map((p) => p.toLowerCase()));
  const out: string[] = [];
  for (const raw of text.split(/[,;\n]/)) {
    const p = raw.trim();
    if (!p || seen.has(p.toLowerCase())) continue;
    seen.add(p.toLowerCase());
    out.push(p);
  }
  return out;
}

/**
 * Productos que maneja el cliente: una etiqueta por producto, con botón para
 * quitarla, y un campo para agregar más (Enter o "Agregar"; acepta varios
 * separados por coma).
 */
export function ProductTagsField({ id, value, onChange, disabled }: { id: string; value: string[]; onChange: (next: string[]) => void; disabled?: boolean }) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const extra = splitProducts(draft, value);
    if (extra.length) onChange([...value, ...extra]);
    setDraft("");
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Productos que maneja</Label>
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Productos capturados">
          {value.map((p) => (
            <li key={p} className="bg-primary/10 text-primary flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium">
              {p}
              {!disabled && (
                <button type="button" aria-label={`Quitar ${p}`} className="hover:bg-primary/20 rounded-sm" onClick={() => onChange(value.filter((x) => x !== p))}>
                  <X className="size-3" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {!disabled && (
        <div className="flex gap-2">
          <Input
            id={id}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
          <Button type="button" variant="outline" onClick={add} disabled={!draft.trim()}>
            <Plus className="size-4" />
            Agregar
          </Button>
        </div>
      )}
      <p className="text-muted-foreground text-xs">Puede manejar varios: escribe uno y agrégalo, o varios separados por coma. Al registrar un embarque se ofrecen para elegir.</p>
    </div>
  );
}
