import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { VendorAppSidebar } from "@/components/dashboard/vendor-app-sidebar";
import { requireVendedor } from "@/lib/auth-server";

export default async function VendorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireVendedor();

  return (
    <SidebarProvider>
      <VendorAppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background/95 px-3 sm:px-5">
          <SidebarTrigger className="-ml-1" />
          <span aria-hidden="true" className="h-4 w-px bg-border" />
          <span className="truncate text-xs font-semibold uppercase tracking-wide text-foreground/70 sm:text-sm">
            Mi panel
          </span>
        </header>
        <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
