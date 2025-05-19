
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Building2, LogOut } from "lucide-react";
import { BottomNav } from "./BottomNav";
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

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

// HeaderLogo is no longer used in the main header but kept for potential other uses.
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
  const pathname = usePathname();
  const { logout } = useAuth();

  let currentTitle = siteConfig.name; // Default title

  // Find the most specific matching navItem for the title
  const sortedNavItems = [...navItems].sort((a, b) => b.href.length - a.href.length);
  const activeNavItem = sortedNavItems.find(item => pathname.startsWith(item.href));

  if (activeNavItem) {
    currentTitle = activeNavItem.title;
  } else if (pathname === '/') {
      const homeItem = navItems.find(item => item.href === '/dashboard');
      if (homeItem) currentTitle = homeItem.title;
  }


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
          <h1 className="text-xl font-bold text-nav-foreground truncate pr-2">{currentTitle}</h1>
          <Button 
            variant="ghost" 
            onClick={logout} 
            className="text-nav-foreground hover:bg-nav-foreground/10 px-2 sm:px-3"
          >
            <LogOut className="h-5 w-5 sm:mr-2" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </header>
        <div className="decorative-border-repeat decorative-border-repeat-h20"></div>
        
        <main className="flex-1 bg-transparent text-foreground relative pb-24 md:pb-0">
          <div className="p-4 md:p-6 lg:p-8 h-full">
            {children}
          </div>
          <div className="decorative-border-repeat decorative-border-repeat-h20 md:hidden"></div>
        </main>
        
        <BottomNav />
      </SidebarInset>
    </SidebarProvider>
  );
}
