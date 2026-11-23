import { AdminQuotesList } from "@/components/dashboard/quotes/admin-quotes-list";

export const metadata = {
  title: "Cotizador nacional | JTP Logistics",
};

export default function QuotesPage() {
  return <AdminQuotesList scope="nacional" />;
}
