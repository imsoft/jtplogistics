import { redirect } from "next/navigation";

export default function NewFinanceRedirectPage() {
  redirect("/admin/dashboard/finances");
}
