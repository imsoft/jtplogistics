import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DeveloperAppSidebar } from "@/components/dashboard/developer-app-sidebar";
import { requireDeveloper } from "@/lib/auth-server";

export default async function DeveloperDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireDeveloper();

  return (
    <SidebarProvider>
      <DeveloperAppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background/95 px-3 sm:px-5">
          <SidebarTrigger className="-ml-1" />
          <span aria-hidden="true" className="h-4 w-px bg-border" />
          <span className="text-sm font-medium text-foreground/70 truncate">
            Mi panel
          </span>
        </header>
        <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
