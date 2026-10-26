import Link from "next/link";
import { CalendarClock, Landmark, ReceiptText, TrendingUp, TriangleAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BillingOverview, Sums } from "@/lib/billing-overview";
import { StatCard, fmtInt, fmtMxn } from "./stat-card";

const fmtUsd = (n: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "USD", currencyDisplay: "code", maximumFractionDigits: 0 }).format(n);
const usd = (s: Sums) => (Math.abs(s.USD) >= 1 ? ` · ${fmtUsd(s.USD)}` : "");
const facturas = (n: number) => `${fmtInt(n)} ${n === 1 ? "factura" : "facturas"}`;

/**
 * Administración en el inicio: dinero en bancos, lo vencido por cobrar, lo
 * que hay que pagar en la semana y el flujo del mes. Los montos son en pesos;
 * si hay dólares se agregan al lado.
 */
export function BillingOverviewCard({ data, base }: { data: BillingOverview; base: "/admin" | "/collaborator" }) {
  const billing = `${base}/dashboard/billing`;
  const net: Sums = { MXN: data.monthIn.MXN - data.monthOut.MXN, USD: data.monthIn.USD - data.monthOut.USD };
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">Administración</CardTitle>
        <Link href={`${billing}/reports`} className="text-primary text-xs font-medium hover:underline">
          Ver reportes
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 2xl:grid-cols-4">
          <StatCard
            label="Dinero en bancos"
            value={fmtMxn(data.bank.MXN)}
            hint={`${data.unreconciled ? `${fmtInt(data.unreconciled)} sin conciliar` : "todo conciliado"}${usd(data.bank)}`}
            icon={<Landmark className="size-5" />}
            href={`${billing}/banks`}
            accent={data.bank.MXN < 0}
          />
          <StatCard
            label="Vencido por cobrar"
            value={fmtMxn(data.receivableOverdue.MXN)}
            hint={`${facturas(data.receivableOverdueCount)} · por cobrar ${fmtMxn(data.receivableOpen.MXN)}${usd(data.receivableOverdue)}`}
            icon={<TriangleAlert className="size-5" />}
            href={`${billing}/receivables`}
            accent={data.receivableOverdueCount > 0}
          />
          <StatCard
            label="Por pagar esta semana"
            value={fmtMxn(data.payableWeek.MXN)}
            hint={`${facturas(data.payableWeekCount)}, vencidas o en 7 días${usd(data.payableWeek)}`}
            icon={<CalendarClock className="size-5" />}
            href={`${billing}/payables`}
          />
          <StatCard
            label="Flujo del mes"
            value={fmtMxn(net.MXN)}
            hint={`entró ${fmtMxn(data.monthIn.MXN)} · salió ${fmtMxn(data.monthOut.MXN)}${usd(net)}`}
            icon={<TrendingUp className="size-5" />}
            href={`${billing}/reports`}
            accent={net.MXN < 0}
          />
        </div>
        {data.drafts > 0 && (
          <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <ReceiptText className="size-3.5" />
            {data.drafts === 1 ? "1 borrador" : `${fmtInt(data.drafts)} borradores`} de embarques sin registrar como factura.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
