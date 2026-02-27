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
      <Card>
        <CardHeader className="space-y-1">
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
        <CardFooter className="flex flex-col gap-4">
          <p className="text-center text-sm text-muted-foreground">
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
