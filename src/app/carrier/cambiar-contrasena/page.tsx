import { redirect } from "next/navigation";
import { requireCarrierPage } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { AuthPageHeader } from "@/components/auth/auth-page-header";
import { ChangePasswordForm } from "./change-password-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Cambiar contraseña | JTP Logistics",
  description: "Elige tu propia contraseña antes de usar la plataforma.",
};

/**
 * Cambio obligatorio de contraseña. Vive fuera de /carrier/dashboard para que
 * la guardia de ese layout pueda mandar aquí sin volver a mandarse a sí misma.
 */
export default async function CarrierChangePasswordPage() {
  const session = await requireCarrierPage();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { mustChangePassword: true },
  });
  if (!user?.mustChangePassword) redirect("/carrier/dashboard");

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-3 py-8 sm:px-4 sm:py-12"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% -10%, oklch(0.92 0.04 264.376 / 0.35) 0%, transparent 70%), oklch(0.974 0.008 264.376)",
      }}
    >
      <div className="w-full max-w-md space-y-4">
        <AuthPageHeader subtitle="Cambiar contraseña" />
        <ChangePasswordForm />
      </div>
    </div>
  );
}
