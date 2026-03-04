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
