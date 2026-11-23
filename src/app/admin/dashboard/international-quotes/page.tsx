import { AdminQuotesList } from "@/components/dashboard/quotes/admin-quotes-list";

export const metadata = {
  title: "Cotizador internacional | JTP Logistics",
};

export default function InternationalQuotesPage() {
  return <AdminQuotesList scope="internacional" />;
}
