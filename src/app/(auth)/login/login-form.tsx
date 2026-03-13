"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { FormAlert } from "@/components/auth/form-alert";
import { useFormSubmit } from "@/hooks/use-form-submit";
import { signIn } from "@/lib/auth-client";
import type { SessionUser } from "@/lib/auth-utils";
import { normalizeEmail } from "@/lib/normalize";
import { validateLoginForm } from "@/lib/validators/auth";
import type { LoginFormData } from "@/types/auth.types";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetSuccess = searchParams.get("reset") === "success";
  const { isLoading, error, setError, submit } = useFormSubmit();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const data: LoginFormData = {
      email: (formData.get("email") as string) ?? "",
      password: (formData.get("password") as string) ?? "",
    };

    const validation = validateLoginForm(data);
    if (!validation.success) {
      setError(validation.error ?? null);
      return;
    }

    await submit(async () => {
      const res = await signIn.email({
        email: normalizeEmail(data.email),
        password: data.password,
      });
      if (res.error) {
        const msg = res.error.message ?? "";
        const spanishMessage =
          msg === "Invalid email or password"
            ? "Correo o contraseña incorrectos."
            : msg || "Error al iniciar sesión.";
        setError(spanishMessage);
        return;
      }
      const role = (res.data?.user as SessionUser | undefined)?.role;
      if (role === "admin") {
        router.push("/admin/dashboard");
      } else if (role === "carrier") {
        router.push("/carrier/dashboard");
      } else {
        router.push("/");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {resetSuccess && (
        <FormAlert variant="success" message="Tu contraseña se ha restablecido correctamente. Ya puedes iniciar sesión." />
      )}
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
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Contraseña</Label>
        </div>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          required
          disabled={isLoading}
        />
      </div>
      <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
        {isLoading ? "Iniciando sesión…" : "Iniciar sesión"}
      </Button>
    </form>
  );
}
