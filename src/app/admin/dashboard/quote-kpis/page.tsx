import { QuoteKpisView } from "@/components/dashboard/quote-kpis/quote-kpis-view";

export const metadata = {
  title: "KPIs de cotizaciones | JTP Logistics",
  description: "Tasa de cierre, montos y desgloses de las cotizaciones",
};

export default function QuoteKpisPage() {
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div>
        <h1 className="page-heading">KPIs de cotizaciones</h1>
        <p className="text-muted-foreground text-sm">Cuánto se cotiza, cuánto se gana y por qué se pierde.</p>
      </div>
      <QuoteKpisView />
    </div>
  );
}
