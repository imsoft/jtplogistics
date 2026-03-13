import { redirect } from "next/navigation";

export default function DeveloperDashboardPage() {
  redirect("/developer/dashboard/tasks");
}
