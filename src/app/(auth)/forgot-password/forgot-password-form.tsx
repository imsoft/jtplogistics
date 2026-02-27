"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormAlert } from "@/components/auth/form-alert";
import { useFormSubmit } from "@/hooks/use-form-submit";
import { requestPasswordReset } from "@/lib/auth-client";
import { normalizeEmail } from "@/lib/normalize";
import { validateForgotPasswordForm } from "@/lib/validators/auth";
import type { ForgotPasswordFormData } from "@/types/auth.types";

const REDIRECT_TO =
  typeof window !== "undefined"
    ? `${window.location.origin}/reset-password`
    : "/reset-password";

export function ForgotPasswordForm() {
  const { isLoading, error, setError, submit } = useFormSubmit();
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSuccess(false);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const data: ForgotPasswordFormData = {
      email: (formData.get("email") as string) ?? "",
    };

    const validation = validateForgotPasswordForm(data);
    if (!validation.success) {
      setError(validation.error ?? null);
      return;
    }

    await submit(async () => {
      const res = await requestPasswordReset({
        email: normalizeEmail(data.email),
        redirectTo: REDIRECT_TO,
      });
      if (res.error) {
        setError(res.error.message ?? "Error al enviar el correo.");
        return;
      }
      setError(null);
      setSuccess(true);
    });
  }

  if (success) {
    return (
      <FormAlert variant="success" message="Si tu correo está registrado, recibirás un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada y spam." />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <FormAlert variant="error" message={error} />}
      <div className="space-y-2">
        <Label htmlFor="email">Correo electrónico</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={isLoading}
          placeholder="tu@correo.com"
        />
      </div>
      <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
        {isLoading ? "Enviando…" : "Enviar enlace"}
      </Button>
    </form>
  );
}
