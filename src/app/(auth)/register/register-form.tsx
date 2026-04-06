"use client";

import { useState } from "react";
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

const PROFILE_SAVE_RETRIES = 2;

export function RegisterForm() {
  const router = useRouter();
  const { isLoading, error, setError, submit } = useFormSubmit();
  const [emailValue, setEmailValue] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const data: RegisterFormData = {
      legalName: (formData.get("legalName") as string)?.trim() ?? "",
      name: (formData.get("name") as string)?.trim() ?? "",
      phone: (formData.get("phone") as string)?.trim() ?? "",
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
      const normalizedEmail = normalizeEmail(data.email);

      const res = await signUp.email({
        name: data.name,
        email: normalizedEmail,
        password: data.password,
        role: "carrier",
      });
      if (res.error) {
        setError(res.error.message ?? "Error al crear la cuenta.");
        return;
      }

      let profileSaved = false;
      for (let attempt = 0; attempt < PROFILE_SAVE_RETRIES; attempt += 1) {
        const profileRes = await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            // En registro público de transportista, si no hay nombre comercial dedicado
            // inicializamos con la razón social para que no quede vacío en perfil.
            commercialName: data.legalName,
            legalName: data.legalName,
            contacts: [{ type: "phone", value: data.phone, label: "Teléfono" }],
          }),
        });
        if (profileRes.ok) {
          profileSaved = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
      }

      if (!profileSaved) {
        setError("La cuenta se creó, pero no se pudieron guardar todos los datos del perfil. Intenta guardar de nuevo desde tu perfil.");
        return;
      }

      router.push("/carrier/dashboard");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <FormAlert variant="error" message={error} />}
      <div className="space-y-2">
        <Label htmlFor="legalName">Razón social</Label>
        <Input
          id="legalName"
          name="legalName"
          type="text"
          autoComplete="organization"
          required
          disabled={isLoading}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Nombre</Label>
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
        <Label htmlFor="phone">Teléfono</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
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
          value={emailValue}
          onChange={(e) => setEmailValue(e.target.value)}
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
