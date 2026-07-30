"use client";

import * as React from "react";
import { Eye, EyeOff, Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { CredentialType } from "@/components/ui/secret-input";

/**
 * Fila de detalle para la contraseña de un activo.
 *
 * Mantiene el mismo aspecto que InfoRow, pero el valor no viaja con la
 * respuesta del recurso: se pide a /api/credentials al pulsar el ojo, que lo
 * descifra y registra quién lo vio.
 */
export function SecretRow({
  label = "Contraseña",
  type,
  resourceId,
  hasPassword,
}: {
  label?: string;
  type: CredentialType;
  resourceId: string;
  hasPassword: boolean;
}) {
  const [value, setValue] = React.useState<string | null>(null);
  const [visible, setVisible] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  async function toggle() {
    if (visible) {
      setVisible(false);
      return;
    }
    if (value !== null) {
      setVisible(true);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/credentials/${type}/${resourceId}`);
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(body.error ?? "No se pudo obtener la contraseña.");
        return;
      }
      const { password } = (await res.json()) as { password: string | null };
      setValue(password ?? "");
      setVisible(true);
    } catch {
      toast.error("Error de conexión al obtener la contraseña.");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("No se pudo copiar.");
    }
  }

  return (
    <div className="flex flex-col gap-0.5 border-b py-3 last:border-0 sm:grid sm:grid-cols-[minmax(11rem,42%)_1fr] sm:gap-2 sm:items-start">
      <span className="text-muted-foreground text-xs leading-snug sm:text-sm">{label}</span>
      {!hasPassword ? (
        <span className="text-sm font-medium">—</span>
      ) : (
        <span className="flex items-center gap-1">
          <span className="text-sm font-medium break-all">
            {visible ? value || "—" : "••••••••••"}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={toggle}
            disabled={loading}
            aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {loading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : visible ? (
              <EyeOff className="size-3.5" />
            ) : (
              <Eye className="size-3.5" />
            )}
          </Button>
          {visible && value ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={copy}
              aria-label="Copiar contraseña"
            >
              {copied ? <Check className="size-3.5 text-green-600" /> : <Copy className="size-3.5" />}
            </Button>
          ) : null}
        </span>
      )}
    </div>
  );
}
