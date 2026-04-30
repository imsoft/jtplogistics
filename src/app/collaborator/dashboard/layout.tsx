import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { CollaboratorAppSidebar } from "@/components/dashboard/collaborator-app-sidebar";
import { GlobalSearch } from "@/components/global-search";
import { NotificationBell } from "@/components/notification-bell";
import { FloatingChat } from "@/components/floating-chat";
import { dashboardMainWithFloatingChatClassName } from "@/lib/dashboard-shell";

export default function CollaboratorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <CollaboratorAppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background/95 px-3 sm:px-5">
          <SidebarTrigger className="-ml-1" />
          <span aria-hidden="true" className="h-4 w-px bg-border" />
          <span className="truncate flex-1 text-xs font-semibold uppercase tracking-wide text-foreground/70 sm:text-sm">
            Mi panel
          </span>
          <NotificationBell />
          <FloatingChat placement="header" />
          <GlobalSearch />
        </header>
        <div className={dashboardMainWithFloatingChatClassName}>{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
