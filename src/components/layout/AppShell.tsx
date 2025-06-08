
"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { siteConfig, userNavItems, adminNavItems, type NavItemConfig } from "@/config/site";
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
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";
import { BottomNav } from "./BottomNav";
import { UserProfileMenu } from "./UserProfileMenu";
import { cn } from "@/lib/utils";
import { useAdminMode } from "@/contexts/AdminModeContext";
import { useEffect, useState } from "react";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useIsMobile } from "@/hooks/use-mobile"; // Import useIsMobile

interface AppShellProps {
  children: ReactNode;
}

function SidebarLogo() {
  const { isMobile: isSidebarHookMobile } = useSidebar(); // From sidebar context
  const actualIsMobile = useIsMobile(); // Direct check
  const displayMobileLayout = typeof isSidebarHookMobile === 'boolean' ? isSidebarHookMobile : actualIsMobile;


  const { settings: appSettings, isLoading: isLoadingSettings } = useAppSettings();
  const [currentLogoUrl, setCurrentLogoUrl] = useState(siteConfig.defaultLogoUrl);

  useEffect(() => {
    if (!isLoadingSettings) {
      if (appSettings?.logoUrl && appSettings.updateLogoOnSidebar) {
        setCurrentLogoUrl(appSettings.logoUrl);
      } else {
        setCurrentLogoUrl(siteConfig.defaultLogoUrl);
      }
    }
  }, [appSettings, isLoadingSettings]);

  return (
    <Link href="/dashboard" className="flex items-center gap-2 px-2">
      <Image
        src={currentLogoUrl}
        alt={siteConfig.name + " Logo"}
        width={displayMobileLayout ? 24 : 36}
        height={displayMobileLayout ? 24 : 36}
        className=""
        data-ai-hint="logo"
        unoptimized={!!currentLogoUrl.includes('?') || !!currentLogoUrl.includes('&')}
        onError={() => setCurrentLogoUrl(siteConfig.defaultLogoUrl)}
      />
      <span className={cn(
        "text-xl font-bold text-sidebar-foreground",
      )}>
        {siteConfig.name}
      </span>
    </Link>
  );
}

function MainNav({ currentNavItems }: { currentNavItems: NavItemConfig[] }) {
  const pathname = usePathname();
  const { isMobile: isSidebarHookMobile } = useSidebar(); // From sidebar context
  const actualIsMobile = useIsMobile(); // Direct check
  const displayMobileLayout = typeof isSidebarHookMobile === 'boolean' ? isSidebarHookMobile : actualIsMobile;


  return (
    <SidebarMenu>
      {currentNavItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={pathname === item.href || (item.href !== "/dashboard" && item.href !== "/" && pathname.startsWith(item.href))}
            tooltip={{ children: item.title, hidden: displayMobileLayout }}
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

// Internal component to ensure SidebarProvider wraps sidebar-related hooks/components
function AppShellInternal({ children }: AppShellProps) {
  const pathname = usePathname();
  const { isAdminMode } = useAdminMode();
  const { isMobile: isSidebarHookMobile } = useSidebar(); // This is from context, reflects provider's view
  const actualIsMobile = useIsMobile(); // Direct check for rendering decisions
  
  // Prefer actualIsMobile for direct rendering decisions if available,
  // otherwise fallback to context's isMobile (which depends on provider init)
  const displayMobileLayout = typeof actualIsMobile === 'boolean' ? actualIsMobile : isSidebarHookMobile;


  const currentNavItems = isAdminMode ? adminNavItems : userNavItems;

  let currentTitle = siteConfig.name;
  const sortedNavItems = [...currentNavItems].sort((a, b) => b.href.length - a.href.length);
  const activeNavItem = sortedNavItems.find(item => pathname === item.href || (item.href !== "/" && item.href !== "/dashboard" && pathname.startsWith(item.href)));

  if (activeNavItem) {
    currentTitle = activeNavItem.title;
  } else if (pathname === '/' || pathname === '/dashboard') {
      const homeItem = currentNavItems.find(item => item.href === '/dashboard');
      if (homeItem) currentTitle = homeItem.title;
  }
  
  const isWebViewPage = pathname === '/web-view';

  const mainElementClasses = cn(
    "flex flex-col flex-1", // Always a flex column and grows
    isWebViewPage ? "overflow-hidden" : "overflow-y-auto" // Scroll handling based on page
  );

  const contentWrapperClasses = cn(
    isWebViewPage ? "flex flex-col flex-1 p-0 min-h-0" : "flex-1 p-4 md:p-6 lg:p-8" 
  );
  

  return (
    <>
      <Sidebar> {/* Sidebar now renders null on mobile itself */}
        <SidebarHeader>
          <SidebarLogo />
        </SidebarHeader>
        <SidebarContent asChild>
           <ScrollArea className="h-full">
            <MainNav currentNavItems={currentNavItems} />
          </ScrollArea>
        </SidebarContent>
      </Sidebar>
      <SidebarInset className="flex flex-col min-h-screen pb-16 md:pb-0"> {/* pb-16 for bottom nav, md:pb-0 for desktop */}
        <header className="appshell-header sticky top-0 z-40 flex h-16 items-center justify-between border-b px-4 shadow-md">
          <div className="flex items-center gap-2">
            {/* Only show SidebarTrigger on non-mobile views */}
            {!displayMobileLayout && <SidebarTrigger />} 
            <h1 className="text-xl font-bold text-nav-foreground truncate">{currentTitle}</h1>
          </div>
          <div className="flex items-center gap-2">
            <UserProfileMenu />
          </div>
        </header>
        <div className="decorative-border-repeat decorative-border-repeat-h20"></div>

        <main className={mainElementClasses}>
          <div className={contentWrapperClasses}>
            {children}
          </div>
          {/* Mobile bottom border is part of main's parent to allow main to flex correctly */}
        </main>
        
        {/* This decorative border is now outside main, directly in SidebarInset for mobile */}
        {displayMobileLayout && <div className="block md:hidden decorative-border-repeat decorative-border-repeat-h20 mt-auto" />}

        <BottomNav /> {/* BottomNav is aware of mobile state */}
      </SidebarInset>
    </>
  );
}


export function AppShell({ children }: AppShellProps) {
  // Use useIsMobile here to pass an initial hint to SidebarProvider if needed,
  // though SidebarProvider also calls useIsMobile itself.
  // This ensures that defaultOpen is more accurately set initially.
  const isMobileInitial = useIsMobile();
  const defaultOpen = typeof isMobileInitial === 'boolean' ? !isMobileInitial : true;

  return (
    <SidebarProvider defaultOpen={defaultOpen}> 
      <AppShellInternal>{children}</AppShellInternal>
    </SidebarProvider>
  );
}
