
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
import { LogOut } from "lucide-react";
import Image from "next/image";
import { BottomNav } from "./BottomNav";
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { UserProfileMenu } from "./UserProfileMenu";

interface AppShellProps {
  children: ReactNode;
}

function SidebarLogo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2 px-2 group-data-[collapsible=icon]:justify-center">
      <Image 
        src="https://placehold.co/40x40.png" 
        alt={siteConfig.name + " Logo"} 
        width={28} // h-7 equivalent
        height={28} // w-7 equivalent
        className="group-data-[collapsible=icon]:h-6 group-data-[collapsible=icon]:w-6"
        data-ai-hint="calligraphy logo"
      />
      <span className="text-xl font-bold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
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

  let currentTitle = siteConfig.name; 

  const sortedNavItems = [...navItems].sort((a, b) => b.href.length - a.href.length);
  const activeNavItem = sortedNavItems.find(item => pathname === item.href || (item.href !== "/" && item.href !== "/dashboard" && pathname.startsWith(item.href)));

  if (activeNavItem) {
    currentTitle = activeNavItem.title;
  } else if (pathname === '/' || pathname === '/dashboard') {
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
           <ScrollArea className="h-full">
            <MainNav />
          </ScrollArea>
        </SidebarContent>
      </Sidebar>
      <SidebarInset className="flex flex-col min-h-screen">
        <header className="appshell-header sticky top-0 z-40 flex h-16 items-center justify-between border-b px-4 shadow-md">
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="flex items-center gap-2 text-nav-foreground hover:text-nav-foreground/80">
              <Image 
                src="https://placehold.co/32x32.png" 
                alt={siteConfig.name + " Logo"} 
                width={24} // h-6 equivalent
                height={24} // w-6 equivalent
                data-ai-hint="calligraphy logo"
              />
              <h1 className="text-xl font-bold truncate hidden sm:block">{siteConfig.name}</h1>
            </Link>
             <span className="text-xl font-bold text-nav-foreground sm:hidden">|</span>
             <h1 className="text-xl font-bold text-nav-foreground truncate pr-2">{currentTitle}</h1>
          </div>
          {pathname === '/dashboard' ? (
            <UserProfileMenu />
          ) : (
            <Button 
              variant="ghost" 
              onClick={logout} 
              className="text-nav-foreground hover:bg-nav-foreground/10 px-2 sm:px-3"
            >
              <LogOut className="h-5 w-5 sm:mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          )}
        </header>
        <div className="decorative-border-repeat decorative-border-repeat-h20"></div>
        
        <main className="flex flex-col flex-1 bg-transparent text-foreground relative overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-24 md:pb-6">
            {children}
          </div>
          <div className="absolute bottom-16 left-0 right-0 md:hidden decorative-border-repeat decorative-border-repeat-h20"></div>
        </main>
        
        <BottomNav />
      </SidebarInset>
    </SidebarProvider>
  );
}
