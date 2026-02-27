"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, UserRound, type LucideIcon } from "lucide-react";
import { useMemo } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { signOut, useSession } from "@/lib/auth-client";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

interface DashboardSidebarProps {
  navItems?: NavItem[];
  navGroups?: NavGroup[];
  label: string;
  homeHref: string;
  profileHref: string;
}

export function DashboardSidebar({
  navItems,
  navGroups,
  label,
  homeHref,
  profileHref,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { state } = useSidebar();
  const { data: session } = useSession();
  const userName = session?.user?.name ?? "Usuario";
  const userImage = session?.user?.image ?? null;
  const userInitials = useMemo(
    () =>
      userName
        .split(" ")
        .slice(0, 2)
        .map((n: string) => n[0]?.toUpperCase() ?? "")
        .join(""),
    [userName]
  );

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="JTP Logistics">
              <Link href={homeHref} className="flex items-center justify-center">
                <Image
                  src="/images/logo/jtp-logistics.png"
                  alt="JTP Logistics"
                  width={state === "collapsed" ? 28 : 130}
                  height={state === "collapsed" ? 28 : 32}
                  className="object-contain"
                  priority
                />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {navGroups
          ? navGroups.map((group) => (
              <SidebarGroup key={group.label}>
                <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={pathname === item.href}
                          tooltip={item.title}
                        >
                          <Link href={item.href}>
                            <item.icon />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))
          : (
              <SidebarGroup>
                <SidebarGroupLabel>{label}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {(navItems ?? []).map((item) => (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={pathname === item.href}
                          tooltip={item.title}
                        >
                          <Link href={item.href}>
                            <item.icon />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === profileHref}
              tooltip={userName}
              className="text-muted-foreground text-xs"
            >
              <Link href={profileHref}>
                <div className="bg-primary text-primary-foreground size-4 shrink-0 rounded-full overflow-hidden flex items-center justify-center text-[8px] font-semibold">
                  {userImage ? (
                    <Image src={userImage} alt={userName} width={16} height={16} className="object-cover w-full h-full" />
                  ) : (
                    userInitials
                  )}
                </div>
                <span>{userName}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Cerrar sesión"
              className="text-muted-foreground text-xs"
              onClick={handleSignOut}
            >
              <LogOut className="size-4" />
              <span>Cerrar sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
