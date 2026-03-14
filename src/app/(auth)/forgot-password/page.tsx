import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthPageHeader } from "@/components/auth/auth-page-header";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata = {
  title: "Olvidé mi contraseña | JTP Logistics",
  description: "Restablece tu contraseña de JTP Logistics",
};

export default function ForgotPasswordPage() {
  return (
    <>
      <AuthPageHeader subtitle="Restablecer contraseña" />
      <Card className="shadow-xl border-border/60">
        <CardHeader className="space-y-1 pb-2">
          <CardTitle className="text-lg sm:text-xl">
            ¿Olvidaste tu contraseña?
          </CardTitle>
          <CardDescription>
            Ingresa tu correo y te enviaremos un enlace para restablecer tu
            contraseña.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ForgotPasswordForm />
        </CardContent>
        <CardFooter className="border-t pt-5">
          <p className="w-full text-center text-sm text-muted-foreground">
            ¿Recordaste tu contraseña?{" "}
            <Link
              href="/login"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Iniciar sesión
            </Link>
          </p>
        </CardFooter>
      </Card>
    </>
  );
}
