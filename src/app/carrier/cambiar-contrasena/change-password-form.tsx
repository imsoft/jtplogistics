"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { ActionBar } from "@/components/ui/form-actions";
import { FormSection, RequiredText } from "@/components/ui/form-section";
import { FormAlert } from "@/components/auth/form-alert";
import { authClient, signOut } from "@/lib/auth-client";
import { validateResetPasswordForm } from "@/lib/validators/auth";

export function ChangePasswordForm() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPassword) return setError("Escribe tu contraseña actual.");
    const validation = validateResetPasswordForm({ newPassword, confirmPassword });
    if (!validation.success) return setError(validation.error ?? null);
    if (newPassword === currentPassword) return setError("La nueva contraseña debe ser distinta de la actual.");

    setError(null);
    setIsSaving(true);
    try {
      const res = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true });
      if (res.error) {
        setError(
          res.error.code === "INVALID_PASSWORD"
            ? "La contraseña actual no es correcta."
            : res.error.message ?? "No se pudo cambiar la contraseña."
        );
        return;
      }
      const done = await fetch("/api/carrier/password-changed", { method: "POST" });
      if (!done.ok) {
        const body = (await done.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "La contraseña cambió, pero no se pudo continuar. Intenta de nuevo.");
        return;
      }
      router.replace("/carrier/dashboard");
      router.refresh();
    } catch {
      setError("Algo salió mal. Intenta de nuevo.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormSection
        icon={KeyRound}
        title="Elige tu contraseña"
        description="Por seguridad, antes de continuar cambia la contraseña temporal que te enviamos (tu RFC)."
        className="space-y-4"
      >
        <div className="space-y-2">
          <Label htmlFor="currentPassword">
            <RequiredText>Contraseña actual</RequiredText>
          </Label>
          <PasswordInput
            id="currentPassword"
            autoComplete="current-password"
            required
            disabled={isSaving}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <p className="text-muted-foreground text-xs">La que te llegó por correo: tu RFC.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="newPassword">
            <RequiredText>Nueva contraseña</RequiredText>
          </Label>
          <PasswordInput
            id="newPassword"
            autoComplete="new-password"
            required
            minLength={8}
            disabled={isSaving}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <p className="text-muted-foreground text-xs">Al menos 8 caracteres.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">
            <RequiredText>Confirmar nueva contraseña</RequiredText>
          </Label>
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            required
            minLength={8}
            disabled={isSaving}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        {error && <FormAlert variant="error" message={error} />}
      </FormSection>

      <ActionBar>
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          disabled={isSaving}
          onClick={() => signOut({ fetchOptions: { onSuccess: () => router.push("/login") } })}
        >
          Salir
        </Button>
        <Button type="submit" className="w-full sm:w-auto" disabled={isSaving}>
          {isSaving && <Loader2 className="size-4 animate-spin" />}
          Guardar contraseña
        </Button>
      </ActionBar>
    </form>
  );
}
