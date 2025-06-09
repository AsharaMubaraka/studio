
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
import { useEffect, useState, useMemo, useCallback } from "react";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useIsMobile } from "@/hooks/use-mobile"; 
import { Loader2 } from "lucide-react";
import { AdPlaceholder } from "@/components/ads/AdPlaceholder";
import { NotificationPermissionDialog } from "./NotificationPermissionDialog"; // Import the new dialog
import { useAuth } from "@/hooks/useAuth"; // Import useAuth

interface AppShellProps {
  children: ReactNode;
}

const NOTIFICATION_DIALOG_DISMISS_KEY_PREFIX = `${siteConfig.name.toLowerCase().replace(/\s+/g, '_')}_notification_dialog_dismissed_until_v1_`;

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
        width={displayMobileLayout ? 28 : 40}
        height={displayMobileLayout ? 28 : 40}
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
  const { user } = useAuth(); // Get user from auth context
  const { isAdminMode } = useAdminMode();
  const { settings: appSettings, isLoading: isLoadingSettings } = useAppSettings();
  const { isMobile: isSidebarHookMobile } = useSidebar(); 
  const actualIsMobile = useIsMobile(); 
  
  const displayMobileLayout = typeof actualIsMobile === 'boolean' ? actualIsMobile : isSidebarHookMobile;

  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const NOTIFICATION_DIALOG_DISMISS_KEY = user ? `${NOTIFICATION_DIALOG_DISMISS_KEY_PREFIX}${user.username}` : '';


  useEffect(() => {
    if (user && NOTIFICATION_DIALOG_DISMISS_KEY && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      const dismissedUntilString = localStorage.getItem(NOTIFICATION_DIALOG_DISMISS_KEY);
      const now = new Date().getTime();

      if (dismissedUntilString) {
        const dismissedUntil = parseInt(dismissedUntilString, 10);
        if (dismissedUntil > now) {
          setShowNotificationDialog(false);
          return;
        } else {
          // Clean up expired dismissal
          localStorage.removeItem(NOTIFICATION_DIALOG_DISMISS_KEY);
        }
      }
      // If no valid dismissal or expired, show the dialog
      setShowNotificationDialog(true);
    } else {
      setShowNotificationDialog(false);
    }
  }, [user, NOTIFICATION_DIALOG_DISMISS_KEY]);

  const handleNotificationDialogClose = useCallback((permissionGranted: boolean, remindLater: boolean = false) => {
    setShowNotificationDialog(false);
    if (!NOTIFICATION_DIALOG_DISMISS_KEY) return;

    let dismissalDuration;
    if (remindLater) { // "Not Now" was clicked
      dismissalDuration = 7 * 24 * 60 * 60 * 1000; // 7 days
    } else if (permissionGranted || Notification.permission === 'denied') {
      // Permission granted OR explicitly denied by user through browser prompt
      dismissalDuration = 365 * 24 * 60 * 60 * 1000; // 1 year (effectively permanent for this version)
    } else {
        // Default case: User closed browser prompt without choosing, or some other scenario
        // Treat as "remind later" to be less aggressive
        dismissalDuration = 1 * 24 * 60 * 60 * 1000; // 1 day before trying again
    }
    
    if (dismissalDuration) {
        const dismissedUntil = new Date().getTime() + dismissalDuration;
        localStorage.setItem(NOTIFICATION_DIALOG_DISMISS_KEY, dismissedUntil.toString());
    }
  }, [NOTIFICATION_DIALOG_DISMISS_KEY]);


  const currentNavItems = useMemo(() => {
    let baseItems = isAdminMode ? baseAdminNavItems : baseUserNavItems;
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
          {/* AdPlaceholder is no longer globally here, added to specific pages */}
        </main>
        
        {displayMobileLayout && <div className="block md:hidden decorative-border-repeat decorative-border-repeat-h20 mt-auto" />}

        <BottomNav /> 
      </SidebarInset>
      {user && ( /* Only attempt to render dialog if user is available */
        <NotificationPermissionDialog
          open={showNotificationDialog}
          onOpenChange={setShowNotificationDialog}
          onDialogClose={handleNotificationDialogClose}
        />
      )}
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
