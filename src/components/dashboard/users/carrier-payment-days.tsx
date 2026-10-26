"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Días de pago del transportista: el trato de JTP con él. Con ellos vence su
 * cuenta por pagar. Lo pone JTP; el transportista no lo ve ni lo cambia.
 */
export function CarrierPaymentDays({ carrierId, initial, canEdit }: { carrierId: string; initial: number | null; canEdit: boolean }) {
  const [saved, setSaved] = useState(initial);
  const [value, setValue] = useState(initial != null ? String(initial) : "");
  const [busy, setBusy] = useState(false);
  const dirty = value !== (saved != null ? String(saved) : "");

  async function save() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${carrierId}/payment-days`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentDays: value }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string; paymentDays?: number | null };
      if (!res.ok) throw new Error(d.error ?? "No se pudo guardar.");
      setSaved(d.paymentDays ?? null);
      toast.success("Días de pago guardados.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">Días de pago</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {canEdit ? (
          <div className="space-y-2">
            <Label htmlFor="carrier-payment-days">Le pagamos a</Label>
            <div className="flex items-center gap-2">
              <Input
                id="carrier-payment-days"
                inputMode="numeric"
                maxLength={3}
                value={value}
                onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
                className="w-24"
              />
              <span className="text-sm">días</span>
              <Button size="sm" onClick={save} disabled={busy || !dirty}>
                {busy && <Loader2 className="size-4 animate-spin" />}
                Guardar
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              Con ellos vence cada factura suya en cuentas por pagar. Vacío: 30 días. El transportista no lo ve.
            </p>
          </div>
        ) : (
          <p className="text-sm">{saved != null ? `${saved} días` : "Sin definir (30 días)"}</p>
        )}
      </CardContent>
    </Card>
  );
}
