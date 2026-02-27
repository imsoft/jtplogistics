import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthPageHeader } from "@/components/auth/auth-page-header";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata = {
  title: "Restablecer contraseña | JTP Logistics",
  description: "Establece tu nueva contraseña",
};

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string; error?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;
  const token = params.token ?? "";
  const error = params.error;

  return (
    <>
      <AuthPageHeader subtitle="Nueva contraseña" />
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg sm:text-xl">
            Nueva contraseña
          </CardTitle>
          <CardDescription>
            Ingresa tu nueva contraseña. Debe tener al menos 8 caracteres.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!token ? (
            <div className="space-y-4">
              {error === "INVALID_TOKEN" && (
                <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  El enlace de restablecimiento ha expirado o no es válido. Solicita uno nuevo.
                </p>
              )}
              <p className="text-muted-foreground text-sm">
                Necesitas un enlace válido para restablecer tu contraseña. Si llegaste aquí por error, solicita uno nuevo desde la página de inicio de sesión.
              </p>
              <Link
                href="/forgot-password"
                className="text-primary inline-flex items-center text-sm font-medium underline-offset-4 hover:underline"
              >
                Solicitar nuevo enlace
              </Link>
            </div>
          ) : (
            <ResetPasswordForm token={token} />
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <p className="text-center text-sm text-muted-foreground">
            <Link
              href="/login"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Volver a iniciar sesión
            </Link>
          </p>
        </CardFooter>
      </Card>
    </>
  );
}
