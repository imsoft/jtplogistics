import { Suspense } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthPageHeader } from "@/components/auth/auth-page-header";
import { LoginForm } from "./login-form";
import { redirectIfAuthenticated } from "@/lib/auth-server";

export const metadata = {
  title: "Iniciar sesión | JTP Logistics",
  description: "Inicia sesión en tu cuenta de JTP Logistics",
};

export default async function LoginPage() {
  await redirectIfAuthenticated();

  return (
    <>
      <AuthPageHeader subtitle="Inicia sesión en tu cuenta" />
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg sm:text-xl">Iniciar sesión</CardTitle>
          <CardDescription>
            Ingresa tus credenciales para acceder a tu cuenta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense>
            <LoginForm />
          </Suspense>
          <p className="mt-3 text-center">
            <Link
              href="/forgot-password"
              className="text-muted-foreground text-sm hover:text-primary hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <p className="text-center text-sm text-muted-foreground">
            ¿No tienes cuenta?{" "}
            <Link
              href="/register"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Regístrate
            </Link>
          </p>
        </CardFooter>
      </Card>
    </>
  );
}
