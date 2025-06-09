
"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { siteConfig, userNavItems as baseUserNavItems, adminNavItems as baseAdminNavItems, type NavItemConfig } from "@/config/site";
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
import { useEffect, useState, useMemo } from "react";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useIsMobile } from "@/hooks/use-mobile"; 
import { Loader2 } from "lucide-react";
// import { AdPlaceholder } from "@/components/ads/AdPlaceholder"; // Removed: Ads will be placed on specific pages

interface AppShellProps {
  children: ReactNode;
}

function SidebarLogo() {
  const { isMobile: isSidebarHookMobile } = useSidebar(); 
  const actualIsMobile = useIsMobile(); 
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
  const { isMobile: isSidebarHookMobile } = useSidebar(); 
  const actualIsMobile = useIsMobile(); 
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

function AppShellInternal({ children }: AppShellProps) {
  const pathname = usePathname();
  const { isAdminMode } = useAdminMode();
  const { settings: appSettings, isLoading: isLoadingSettings } = useAppSettings();
  const { isMobile: isSidebarHookMobile } = useSidebar(); 
  const actualIsMobile = useIsMobile(); 
  
  const displayMobileLayout = typeof actualIsMobile === 'boolean' ? actualIsMobile : isSidebarHookMobile;

  const currentNavItems = useMemo(() => {
    let baseItems = isAdminMode ? baseAdminNavItems : baseUserNavItems;
    // Ensure appSettings is available and showLiveRelayPage is explicitly false before filtering
    if (appSettings && typeof appSettings.showLiveRelayPage === 'boolean' && !appSettings.showLiveRelayPage) {
      baseItems = baseItems.filter(item => item.href !== '/live-relay');
    }
    return baseItems;
  }, [isAdminMode, appSettings]);
  
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
    "flex flex-col flex-1", 
    isWebViewPage ? "overflow-hidden" : "overflow-y-auto" 
  );

  const contentWrapperClasses = cn(
    isWebViewPage ? "flex flex-col flex-1 p-0 min-h-0" : "flex-1 p-4 md:p-6 lg:p-8" 
  );
  
  // Show loader if settings are loading for the first time (appSettings is null)
  if (isLoadingSettings && appSettings === null) { 
    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <>
      <Sidebar> 
        <SidebarHeader>
          <SidebarLogo />
        </SidebarHeader>
        <SidebarContent asChild>
           <ScrollArea className="h-full">
            <MainNav currentNavItems={currentNavItems} />
          </ScrollArea>
        </SidebarContent>
      </Sidebar>
      <SidebarInset className="flex flex-col min-h-screen pb-16 md:pb-0"> 
        <header className="appshell-header sticky top-0 z-40 flex h-16 items-center justify-between border-b px-4 shadow-md">
          <div className="flex items-center gap-2">
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
          {/* AdPlaceholder removed from here. It will be added to specific pages manually. */}
        </main>
        
        {displayMobileLayout && <div className="block md:hidden decorative-border-repeat decorative-border-repeat-h20 mt-auto" />}

        <BottomNav /> 
      </SidebarInset>
    </>
  );
}


export function AppShell({ children }: AppShellProps) {
  const isMobileInitial = useIsMobile();
  const defaultOpen = typeof isMobileInitial === 'boolean' ? !isMobileInitial : true;

  return (
    <SidebarProvider defaultOpen={defaultOpen}> 
      <AppShellInternal>{children}</AppShellInternal>
    </SidebarProvider>
  );
}
