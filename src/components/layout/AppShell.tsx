
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
  SidebarTrigger, // Import SidebarTrigger
} from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LogOut } from "lucide-react";
import Image from "next/image";
import { BottomNav } from "./BottomNav";
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { UserProfileMenu } from "./UserProfileMenu";
import { cn } from "@/lib/utils"; // Added this import

interface AppShellProps {
  children: ReactNode;
}

function SidebarLogo() {
  const { isMobile } = useSidebar(); // Use context to adapt logo if needed
  return (
    <Link href="/dashboard" className="flex items-center gap-2 px-2">
      <Image 
        src="https://live.lunawadajamaat.org/wp-content/uploads/2025/05/Picsart_25-05-19_18-32-50-677.png" 
        alt={siteConfig.name + " Logo"} 
        width={isMobile ? 24 : 28} // Slightly smaller on mobile sheet
        height={isMobile ? 24 : 28}
        className="" // Removed group-data specific classes as collapsible state is simplified
      />
      <span className={cn(
        "text-xl font-bold text-sidebar-foreground",
        // Add logic here if you have icon-only collapsible state:
        // "group-data-[collapsible=icon]:hidden" 
      )}>
        {siteConfig.name}
      </span>
    </Link>
  );
}

function MainNav() {
  const pathname = usePathname();
  const { isMobile } = useSidebar(); // For tooltip logic

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
              {/* The span's visibility for icon-only state needs to be handled here or in SidebarMenuButton */}
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
    <SidebarProvider defaultOpen={true}> {/* Desktop sidebar open by default, mobile sheet closed by default */}
      <Sidebar> {/* Handles Sheet on mobile, aside on desktop */}
        <SidebarHeader> {/* Using new SidebarHeader's default padding */}
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
            <SidebarTrigger className="md:hidden mr-2" /> {/* Mobile sidebar trigger */}
            <Link href="/dashboard" className="flex items-center gap-2 text-nav-foreground hover:text-nav-foreground/80">
              <Image 
                src="https://live.lunawadajamaat.org/wp-content/uploads/2025/05/Picsart_25-05-19_18-32-50-677.png" 
                alt={siteConfig.name + " Logo"} 
                width={24} 
                height={24} 
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
          {/* This div handles padding and scrolling for the main content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-24 md:pb-8 h-full">
            {children}
          </div>
          {/* Decorative border for mobile, above BottomNav */}
          <div className="absolute bottom-16 left-0 right-0 md:hidden decorative-border-repeat decorative-border-repeat-h20"></div>
        </main>
        
        <BottomNav />
      </SidebarInset>
    </SidebarProvider>
  );
}

    