import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { UserAppSidebar } from "@/components/dashboard/user-app-sidebar";

export default function CarrierDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <UserAppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3 sm:px-4">
          <SidebarTrigger />
          <span className="text-muted-foreground truncate text-sm">
            Mi panel
          </span>
        </header>
        <div className="flex min-w-0 flex-1 flex-col p-3 sm:p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
