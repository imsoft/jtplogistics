import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AuthPageHeader } from "@/components/auth/auth-page-header";
import { RegisterForm } from "./register-form";
import { redirectIfAuthenticated } from "@/lib/auth-server";

export const metadata = {
  title: "Registro | JTP Logistics",
  description: "Crea tu cuenta en JTP Logistics",
};

export default async function RegisterPage() {
  await redirectIfAuthenticated();

  return (
    <>
      <AuthPageHeader subtitle="Crea tu cuenta" />
      <Card className="shadow-xl border-border/60">
        <CardHeader className="space-y-1 pb-2">
          <CardTitle className="text-lg sm:text-xl">Registro</CardTitle>
          <CardDescription>
            Ingresa tus datos para crear una cuenta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm />
        </CardContent>
        <CardFooter className="border-t pt-5">
          <p className="w-full text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{" "}
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
