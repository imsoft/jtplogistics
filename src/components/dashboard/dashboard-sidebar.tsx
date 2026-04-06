"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, type LucideIcon } from "lucide-react";
import { useMemo, useEffect, useState } from "react";
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight } from "lucide-react";
import { signOut, useSession } from "@/lib/auth-client";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  subItems?: { title: string; href: string }[];
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
  showWhatsAppContact?: boolean;
}

const WHATSAPP_DEFAULT_MESSAGE = "Hola, soy transportista y necesito ayuda con la plataforma JTP Logistics.";

export function DashboardSidebar({
  navItems,
  navGroups,
  label,
  homeHref,
  profileHref,
  showWhatsAppContact = false,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { state } = useSidebar();
  const { data: session } = useSession();
  const [jtpWhatsapp, setJtpWhatsapp] = useState<string | null>(null);

  useEffect(() => {
    if (!showWhatsAppContact) return;
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => { if (data.jtp_whatsapp) setJtpWhatsapp(data.jtp_whatsapp); })
      .catch(() => {});
  }, [showWhatsAppContact]);

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
      <SidebarHeader className="border-b py-1 px-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="JTP Logistics" className="hover:bg-transparent active:bg-transparent">
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
                <SidebarGroupLabel className="text-muted-foreground/60">
                  {group.label}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) =>
                      item.subItems && item.subItems.length > 0 ? (
                        <Collapsible
                          key={item.href}
                          asChild
                          defaultOpen={pathname.startsWith(item.href)}
                          className="group/collapsible"
                        >
                          <SidebarMenuItem>
                            <CollapsibleTrigger asChild>
                              <SidebarMenuButton
                                tooltip={item.title}
                                isActive={pathname.startsWith(item.href)}
                              >
                                <item.icon />
                                <span>{item.title}</span>
                                <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                              </SidebarMenuButton>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <SidebarMenuSub>
                                {item.subItems.map((sub) => (
                                  <SidebarMenuSubItem key={sub.href}>
                                    <SidebarMenuSubButton
                                      asChild
                                      isActive={pathname === sub.href}
                                    >
                                      <Link href={sub.href}>
                                        <span>{sub.title}</span>
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                ))}
                              </SidebarMenuSub>
                            </CollapsibleContent>
                          </SidebarMenuItem>
                        </Collapsible>
                      ) : (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton
                            asChild
                            isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
                            tooltip={item.title}
                          >
                            <Link href={item.href}>
                              <item.icon />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))
          : (
              <SidebarGroup>
                <SidebarGroupLabel className="text-muted-foreground/60">
                  {label}
                </SidebarGroupLabel>
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

      <SidebarFooter className="pt-0">
        <SidebarSeparator className="mb-1" />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === profileHref}
              tooltip={userName}
              size="sm"
            >
              <Link href={profileHref} className="flex items-center gap-2.5">
                <div className="bg-primary text-primary-foreground size-6 shrink-0 rounded-full overflow-hidden flex items-center justify-center text-[10px] font-bold ring-2 ring-primary/20">
                  {userImage ? (
                    <Image src={userImage} alt={userName} width={24} height={24} className="object-cover w-full h-full" />
                  ) : (
                    userInitials
                  )}
                </div>
                <span className="truncate text-sm font-semibold uppercase tracking-wide">{userName}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {showWhatsAppContact && jtpWhatsapp && (
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Contactar JTP (soporte)"
                className="text-muted-foreground hover:text-foreground"
              >
                <a
                  href={`https://wa.me/${jtpWhatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(WHATSAPP_DEFAULT_MESSAGE)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Image
                    src="/images/whatsapp/whatsapp.svg"
                    alt="WhatsApp"
                    width={20}
                    height={20}
                    className="size-5"
                  />
                  <span>Contactar JTP</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Cerrar sesión"
              size="sm"
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/8"
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
