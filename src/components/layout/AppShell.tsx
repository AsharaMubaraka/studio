
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

interface AppShellProps {
  children: ReactNode;
}

function SidebarLogo() {
  const { isMobile } = useSidebar();
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
        width={isMobile ? 24 : 28}
        height={isMobile ? 24 : 28}
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
  const { isMobile } = useSidebar();

  return (
    <SidebarMenu>
      {currentNavItems.map((item) => (
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

// Internal component to ensure SidebarProvider wraps sidebar-related hooks/components
function AppShellInternal({ children }: AppShellProps) {
  const pathname = usePathname();
  const { isAdminMode } = useAdminMode();

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

  const contentWrapperClasses = cn(
    "flex-1", // Common: take available space
    isWebViewPage ? "flex flex-col p-0" : "p-4 md:p-6 lg:p-8 overflow-y-auto" 
  );

  return (
    <SidebarProvider defaultOpen={true}>
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
            <SidebarTrigger className="md:hidden" />
            <h1 className="text-xl font-bold text-nav-foreground truncate">{currentTitle}</h1>
          </div>
          <div className="flex items-center gap-2">
            <UserProfileMenu />
          </div>
        </header>
        <div className="decorative-border-repeat decorative-border-repeat-h20"></div>

        <main className="flex flex-col flex-1 bg-transparent text-foreground overflow-hidden"> {/* Added overflow-hidden here */}
          <div className={contentWrapperClasses}>
            {children}
          </div>
          {/* Bottom decorative border for mobile, rendered before BottomNav space */}
          <div className="block md:hidden decorative-border-repeat decorative-border-repeat-h20" />
        </main>
        
        <BottomNav />
      </SidebarInset>
    </SidebarProvider>
  );
}


export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  // This outer component now only decides if we render the full app shell or just the webview
  // The SidebarProvider is now inside AppShellInternal
  if (pathname === '/web-view-full') { // hypothetical full screen route
    return (
      <div className="h-screen w-screen overflow-hidden">
        {children}
      </div>
    );
  }

  return <AppShellInternal>{children}</AppShellInternal>;
}
