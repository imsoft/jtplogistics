import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { GlobalSearch } from "@/components/global-search";
import { NotificationBell } from "@/components/notification-bell";
import { FloatingChat } from "@/components/floating-chat";
import { requireAdmin } from "@/lib/auth-server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background/95 px-3 sm:px-5">
          <SidebarTrigger className="-ml-1" />
          <span aria-hidden="true" className="h-4 w-px bg-border" />
          <span className="text-sm font-medium text-foreground/70 truncate flex-1">
            Panel de administración
          </span>
          <NotificationBell />
          <GlobalSearch />
        </header>
        <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-6">{children}</div>
      </SidebarInset>
      <FloatingChat />
    </SidebarProvider>
  );
}
