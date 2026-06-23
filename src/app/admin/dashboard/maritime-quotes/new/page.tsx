import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/auth-server";
import { MaritimeQuoteForm } from "@/components/dashboard/maritime-quotes/maritime-quote-form";

export const metadata = {
  title: "Nueva cotización marítima | JTP Logistics",
};

export default async function NewMaritimeQuotePage() {
  await requireAdminPage();
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href="/admin/dashboard/maritime-quotes" aria-label="Volver">
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="page-heading">Nueva cotización marítima</h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
            Captura los datos; los impuestos se calculan automáticamente.
          </p>
        </div>
      </div>
      <MaritimeQuoteForm mode="new" backHref="/admin/dashboard/maritime-quotes" />
    </div>
  );
}
