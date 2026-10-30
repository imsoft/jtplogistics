"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Productos que maneja el cliente: una fila por producto con su bote de
 * basura, como las direcciones, y un botón para agregar otra. Las filas
 * vacías se descartan al guardar.
 */
export function ProductTagsField({ id, value, onChange, disabled }: { id: string; value: string[]; onChange: (next: string[]) => void; disabled?: boolean }) {
  const update = (i: number, text: string) => onChange(value.map((p, j) => (j === i ? text : p)));
  const remove = (i: number) => onChange(value.filter((_, j) => j !== i));

  return (
    <div className="space-y-2">
      <Label htmlFor={value.length ? `${id}-0` : undefined}>Productos que maneja</Label>
      {value.length === 0 && <p className="text-muted-foreground text-sm">Sin productos.</p>}
      {value.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input id={`${id}-${i}`} aria-label={`Producto ${i + 1}`} value={p} disabled={disabled} onChange={(e) => update(i, e.target.value)} />
          {!disabled && (
            <Button type="button" variant="ghost" size="icon" className="shrink-0" aria-label={`Quitar producto ${i + 1}`} onClick={() => remove(i)}>
              <Trash2 className="text-destructive size-4" />
            </Button>
          )}
        </div>
      ))}
      {!disabled && (
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...value, ""])}>
          <Plus className="size-4" />
          Agregar producto
        </Button>
      )}
      <p className="text-muted-foreground text-xs">Puede manejar varios. Al registrar un embarque se ofrecen para elegir.</p>
    </div>
  );
}
