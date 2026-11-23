import { NewQuoteView } from "@/components/dashboard/quotes/new-quote-view";

export const metadata = {
  title: "Nueva cotización | JTP Logistics",
};

export default function NewQuotePage() {
  return <NewQuoteView panel="collaborator" scope="nacional" />;
}
