"use client";

import * as React from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

/**
 * Campo de contraseña de un activo (laptop, celular, cuenta de correo,
 * colaborador).
 *
 * A diferencia de PasswordInput, el valor NO viene con el resto del formulario:
 * las respuestas de la API solo dicen si existe. Al pulsar el ojo se pide a
 * /api/credentials, que descifra esa sola contraseña y registra quién la vio.
 *
 * Si la persona escribe encima, el valor nuevo se manda tal cual al guardar y
 * el servidor lo vuelve a cifrar.
 */

export type CredentialType = "laptop" | "phone" | "email" | "employee";

interface SecretInputProps {
  id?: string;
  /** Tipo de activo, para saber a qué recurso pedirle la contraseña. */
  type: CredentialType;
  /** Id del activo. Si no hay (alta nueva), el campo funciona como uno normal. */
  resourceId?: string | null;
  /** Si el activo ya tiene contraseña guardada. */
  hasPassword?: boolean;
  /** Valor actual del formulario: cadena vacía mientras no se revele ni escriba. */
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function SecretInput({
  id,
  type,
  resourceId,
  hasPassword = false,
  value,
  onChange,
  disabled,
  className,
}: SecretInputProps) {
  const [visible, setVisible] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  // Una vez revelada o escrita, el valor ya vive en el formulario.
  const [revealed, setRevealed] = React.useState(false);

  const isNew = !resourceId;
  const needsFetch = hasPassword && !revealed && value === "";

  async function handleToggle() {
    if (visible) {
      setVisible(false);
      return;
    }

    if (!needsFetch) {
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
      onChange(password ?? "");
      setRevealed(true);
      setVisible(true);
    } catch {
      toast.error("Error de conexión al obtener la contraseña.");
    } finally {
      setLoading(false);
    }
  }

  // Mientras no se revele, se muestran puntos de relleno para que se note que
  // sí hay una contraseña guardada.
  const placeholderDots = needsFetch && !visible ? "••••••••••" : "";

  return (
    <InputGroup className={cn("w-full", className)}>
      <InputGroupInput
        id={id}
        type={visible ? "text" : "password"}
        className="normal-case tracking-normal"
        value={value || placeholderDots}
        disabled={disabled}
        onChange={(e) => {
          setRevealed(true);
          onChange(e.target.value);
        }}
        onFocus={() => {
          // Al escribir encima se descarta el relleno y se captura una nueva.
          if (needsFetch) {
            setRevealed(true);
            onChange("");
          }
        }}
        autoComplete="new-password"
      />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={handleToggle}
          disabled={disabled || loading || (isNew && !value)}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          tabIndex={-1}
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : visible ? (
            <EyeOff className="size-4" aria-hidden />
          ) : (
            <Eye className="size-4" aria-hidden />
          )}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}
