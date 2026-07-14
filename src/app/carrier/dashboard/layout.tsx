import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { UserAppSidebar } from "@/components/dashboard/user-app-sidebar";
import { NotificationBell } from "@/components/notification-bell";
import { FloatingChat } from "@/components/floating-chat";
import { CarrierOnboardingTour } from "@/components/dashboard/carrier-onboarding-tour";
import { dashboardMainWithFloatingChatClassName } from "@/lib/dashboard-shell";
import { getSession } from "@/lib/auth-server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CarrierDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const user = session
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { onboardingTourCompletedAt: true },
      })
    : null;
  const tourCompleted = !user || user.onboardingTourCompletedAt !== null;

  return (
    <SidebarProvider>
      <UserAppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background/95 px-3 sm:px-5">
          <SidebarTrigger className="-ml-1" />
          <span aria-hidden="true" className="h-4 w-px bg-border" />
          <span className="truncate flex-1 text-xs font-semibold uppercase tracking-wide text-foreground/70 sm:text-sm">
            Mi panel
          </span>
          <NotificationBell />
          <FloatingChat placement="header" />
        </header>
        <div className={dashboardMainWithFloatingChatClassName}>{children}</div>
      </SidebarInset>
      <CarrierOnboardingTour completed={tourCompleted} />
    </SidebarProvider>
  );
}
