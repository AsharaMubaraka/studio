
"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { siteConfig, navItems } from "@/config/site";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  useSidebar,
} from "@/components/ui/sidebar";
import { UserProfileMenu } from "./UserProfileMenu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Building2 } from "lucide-react";
import { BottomNav } from "./BottomNav";

interface AppShellProps {
  children: ReactNode;
}

function SidebarLogo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2 px-2 group-data-[collapsible=icon]:justify-center">
       <Building2 className="h-7 w-7 text-sidebar-primary group-data-[collapsible=icon]:h-6 group-data-[collapsible=icon]:w-6" />
      <span className="text-xl font-bold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
        {siteConfig.name}
      </span>
    </Link>
  );
}

function HeaderLogo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2 text-nav-foreground">
      <Building2 className="h-6 w-6" />
      <span className="text-xl font-bold">
        {siteConfig.name}
      </span>
    </Link>
  );
}


function MainNav() {
  const pathname = usePathname();
  const { isMobile } = useSidebar();

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={pathname === item.href || (item.href !== "/dashboard" && item.href !== "/" && pathname.startsWith(item.href))}
            tooltip={{ children: item.title, hidden: isMobile }}
          >
            <Link href={item.href}>
              <item.icon />
              <span>{item.title}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

export function AppShell({ children }: AppShellProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar>
        <SidebarHeader className="p-4 border-b border-sidebar-border">
          <SidebarLogo />
        </SidebarHeader>
        <SidebarContent asChild>
           <ScrollArea className="h-full"> {/* h-full on ScrollArea is important for its own scrolling */}
            <MainNav />
          </ScrollArea>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="appshell-header sticky top-0 z-40 flex h-16 items-center justify-between border-b px-4 shadow-md">
          <HeaderLogo />
          <UserProfileMenu />
        </header>
        <div className="decorative-border-repeat decorative-border-repeat-h20"></div>
        
        {/* Main content area: No horizontal padding directly on main. Bottom padding for BottomNav on mobile. */}
        <main className="flex-1 bg-transparent text-foreground relative pb-16 md:pb-0">
          {/* Inner div for content padding. */}
          <div className="p-4 md:p-6 lg:p-8 h-full">
            {children}
          </div>
          {/* This border is for mobile, to appear above the BottomNav. Now full-width. */}
          <div className="decorative-border-repeat decorative-border-repeat-h20 md:hidden"></div>
        </main>
        
        <BottomNav />
      </SidebarInset>
    </SidebarProvider>
  );
}

