"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { BellRing } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { FormSection } from "@/components/ui/form-section";
import { FormSkeleton } from "@/components/ui/skeletons";
import { useConfirm } from "@/components/ui/confirm-provider";
import { cn } from "@/lib/utils";

interface AutoStatus {
  enabled: boolean;
  recent: { id: string; label: string; template: string | null; to: string | null; result: string | null; by: string; at: string }[];
}

const TEMPLATE_LABEL: Record<string, string> = {
  jtp_estado_embarque: "Estado",
  jtp_embarque_retraso: "Retraso",
  jtp_embarque_entregado: "Entregado",
};

/** Prender o apagar el WhatsApp automático al cliente y ver los últimos envíos. */
export function WhatsAppAutoCard() {
  const confirm = useConfirm();
  const [data, setData] = useState<AutoStatus | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    fetch("/api/admin/whatsapp/auto")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: AutoStatus | null) => d && setData(d))
      .catch(() => {});
  }, []);
  useEffect(load, [load]);

  async function toggle(enabled: boolean) {
    if (
      enabled &&
      !(await confirm({
        title: "¿Prender el WhatsApp automático?",
        description: "A partir de ahora, cada cambio de estado en la tabla de embarques le manda un WhatsApp al celular del cliente.",
        confirmLabel: "Prender",
      }))
    )
      return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/whatsapp/auto", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error();
      toast.success(enabled ? "WhatsApp automático prendido." : "WhatsApp automático apagado.");
      load();
    } catch {
      toast.error("No se pudo cambiar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormSection
      icon={BellRing}
      title="WhatsApp automático al cliente"
      description="Al cambiar el estado de un embarque se le manda un WhatsApp al celular del cliente (el de su ficha en Clientes)."
      className="space-y-4"
    >
      {!data ? (
        <FormSkeleton fields={3} />
      ) : (
        <>
          <div className="flex items-center gap-3">
            <Switch id="wa-auto" checked={data.enabled} disabled={saving} onCheckedChange={toggle} />
            <Label htmlFor="wa-auto">{data.enabled ? "Prendido" : "Apagado"}</Label>
          </div>
          <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-xs">
            <li>Entregado y entregado con retraso: plantilla de embarque entregado.</li>
            <li>Retraso por tráfico e incidencias (bloqueo, falla, talacha…): plantilla de retraso.</li>
            <li>Los demás estados: plantilla de estado del embarque. Pendiente y Cerrado no se avisan.</li>
            <li>Con el número de prueba de Meta solo llega a los celulares registrados ahí; prenderlo para clientes cuando JTP tenga su número.</li>
          </ul>
          <div className="space-y-2">
            <p className="text-sm font-semibold">Últimos envíos automáticos</p>
            {data.recent.length === 0 ? (
              <p className="text-muted-foreground text-sm">Todavía no hay envíos.</p>
            ) : (
              <ul className="divide-y rounded-lg border text-sm">
                {data.recent.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-start justify-between gap-2 p-3">
                    <div className="min-w-0">
                      <p className="font-medium">{r.label}</p>
                      <p className="text-muted-foreground text-xs">
                        {TEMPLATE_LABEL[r.template ?? ""] ?? r.template} · {r.to ?? "sin celular"} · {r.by} ·{" "}
                        {new Date(r.at).toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                        r.result === "Enviado" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                      )}
                      title={r.result ?? ""}
                    >
                      {r.result === "Enviado" ? "Enviado" : "No se mandó"}
                    </span>
                    {r.result && r.result !== "Enviado" && <p className="text-muted-foreground w-full text-xs">{r.result}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </FormSection>
  );
}
