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
      <Card className="shadow-xl border-border/60">
        <CardHeader className="space-y-1 pb-2">
          <CardTitle className="text-lg sm:text-xl">Iniciar sesión</CardTitle>
          <CardDescription>
            Ingresa tus credenciales para acceder a tu cuenta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense>
            <LoginForm />
          </Suspense>
          <p className="mt-4 text-center">
            <Link
              href="/forgot-password"
              className="text-muted-foreground text-sm hover:text-primary hover:underline underline-offset-4"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </p>
        </CardContent>
        <CardFooter className="border-t pt-5">
          <p className="w-full text-center text-sm text-muted-foreground">
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
