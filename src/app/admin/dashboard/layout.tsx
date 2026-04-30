import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { GlobalSearch } from "@/components/global-search";
import { NotificationBell } from "@/components/notification-bell";
import { FloatingChat } from "@/components/floating-chat";
import { OnboardingTour } from "@/components/dashboard/onboarding-tour";
import { requireAdmin } from "@/lib/auth-server";
import { dashboardMainWithFloatingChatClassName } from "@/lib/dashboard-shell";

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
          <span className="truncate flex-1 text-xs font-semibold uppercase tracking-wide text-foreground/70 sm:text-sm">
            Panel de administración
          </span>
          <div id="tour-header-notifications">
            <NotificationBell />
          </div>
          <FloatingChat placement="header" />
          <div id="tour-header-search">
            <GlobalSearch />
          </div>
        </header>
        <div className={dashboardMainWithFloatingChatClassName}>{children}</div>
      </SidebarInset>
      <OnboardingTour />
    </SidebarProvider>
  );
}
