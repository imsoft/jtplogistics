"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { FormAlert } from "@/components/auth/form-alert";
import { useFormSubmit } from "@/hooks/use-form-submit";
import { signUp } from "@/lib/auth-client";
import { normalizeEmail } from "@/lib/normalize";
import { validateRegisterForm } from "@/lib/validators/auth";
import type { RegisterFormData } from "@/types/auth.types";

export function RegisterForm() {
  const router = useRouter();
  const { isLoading, error, setError, submit } = useFormSubmit();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const data: RegisterFormData = {
      name: (formData.get("name") as string)?.trim() ?? "",
      email: (formData.get("email") as string)?.trim() ?? "",
      password: (formData.get("password") as string) ?? "",
      confirmPassword: (formData.get("confirmPassword") as string) ?? "",
    };

    const validation = validateRegisterForm(data);
    if (!validation.success) {
      setError(validation.error ?? null);
      return;
    }

    await submit(async () => {
      const res = await signUp.email({
        name: data.name,
        email: normalizeEmail(data.email),
        password: data.password,
        role: "collaborator",
      });
      if (res.error) {
        setError(res.error.message ?? "Error al crear la cuenta.");
        return;
      }
      router.push("/");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <FormAlert variant="error" message={error} />}
      <div className="space-y-2">
        <Label htmlFor="name">Nombre completo</Label>
        <Input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          disabled={isLoading}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Correo electrónico</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={isLoading}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={8}
          disabled={isLoading}
        />
        <p className="text-xs text-muted-foreground">Mínimo 8 caracteres</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          autoComplete="new-password"
          required
          minLength={8}
          disabled={isLoading}
        />
      </div>
      <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
        {isLoading ? "Creando cuenta…" : "Crear cuenta"}
      </Button>
    </form>
  );
}
