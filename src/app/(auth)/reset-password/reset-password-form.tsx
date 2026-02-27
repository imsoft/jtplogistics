"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { FormAlert } from "@/components/auth/form-alert";
import { useFormSubmit } from "@/hooks/use-form-submit";
import { resetPassword } from "@/lib/auth-client";
import { validateResetPasswordForm } from "@/lib/validators/auth";
import type { ResetPasswordFormData } from "@/types/auth.types";

interface ResetPasswordFormProps {
  token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const { isLoading, error, setError, submit } = useFormSubmit();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const data: ResetPasswordFormData = {
      newPassword: (formData.get("newPassword") as string) ?? "",
      confirmPassword: (formData.get("confirmPassword") as string) ?? "",
    };

    const validation = validateResetPasswordForm(data);
    if (!validation.success) {
      setError(validation.error ?? null);
      return;
    }

    await submit(async () => {
      const res = await resetPassword({
        newPassword: data.newPassword,
        token,
      });
      if (res.error) {
        setError(res.error.message ?? "Error al restablecer la contraseña.");
        return;
      }
      router.push("/login?reset=success");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <FormAlert variant="error" message={error} />}
      <div className="space-y-2">
        <Label htmlFor="newPassword">Nueva contraseña</Label>
        <PasswordInput
          id="newPassword"
          name="newPassword"
          autoComplete="new-password"
          required
          disabled={isLoading}
          minLength={8}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          autoComplete="new-password"
          required
          disabled={isLoading}
          minLength={8}
        />
      </div>
      <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
        {isLoading ? "Guardando…" : "Restablecer contraseña"}
      </Button>
    </form>
  );
}
