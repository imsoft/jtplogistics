import { Separator } from "@/components/ui/separator";
import { WhatsAppDemos } from "@/components/dashboard/admin/whatsapp-demos";
import { requireAdminPage } from "@/lib/auth-server";

export const metadata = {
  title: "WhatsApp de prueba | JTP Logistics",
  description: "Mandar mensajes de prueba por WhatsApp con las plantillas de JTP",
};

export default async function WhatsAppDemosPage() {
  await requireAdminPage();

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="min-w-0">
        <h1 className="page-heading">WhatsApp de prueba</h1>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
          Manda mensajes de prueba por WhatsApp al número que quieras: plantillas, texto libre o la imagen de seguimiento de un
          embarque.
        </p>
      </div>
      <Separator />
      <WhatsAppDemos />
    </div>
  );
}
