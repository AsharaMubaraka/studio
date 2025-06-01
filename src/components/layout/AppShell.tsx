
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
import { fetchAppSettings } from "@/actions/settingsActions";
import type { AppSettings } from "@/lib/schemas/settingsSchemas";

interface AppShellProps {
  children: ReactNode;
}

function SidebarLogo() {
  const { isMobile } = useSidebar();
  const [currentLogoUrl, setCurrentLogoUrl] = useState(siteConfig.defaultLogoUrl);

  useEffect(() => {
    fetchAppSettings().then(settings => {
      if (settings?.logoUrl && settings.updateLogoOnSidebar) {
        setCurrentLogoUrl(settings.logoUrl);
      } else {
        setCurrentLogoUrl(siteConfig.defaultLogoUrl);
      }
    }).catch(() => {
      setCurrentLogoUrl(siteConfig.defaultLogoUrl);
    });
  }, []);

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

export function AppShell({ children }: AppShellProps) {
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

  // This div wraps the children.
  const contentWrapperClasses = cn(
    "flex-1 overflow-y-auto", // Grow and allow its own content to scroll
    {
      "p-4 md:p-6 lg:p-8 pb-24 md:pb-8": !isWebViewPage, // Standard padding for other pages
      // For web-view, no padding from this wrapper. The web-view page itself will be h-full.
    }
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
      <SidebarInset className="flex flex-col min-h-screen"> {/* Parent flex column */}
        <header className="appshell-header sticky top-0 z-40 flex h-16 items-center justify-between border-b px-4 shadow-md">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="md:hidden" /> {/* Trigger for mobile */}
            <h1 className="text-xl font-bold text-nav-foreground truncate">{currentTitle}</h1>
          </div>
          <div className="flex items-center gap-2">
            <UserProfileMenu />
          </div>
        </header>
        <div className="decorative-border-repeat decorative-border-repeat-h20"></div> {/* Top border */}

        {/* Main content area + mobile bottom border */}
        <main className="flex flex-col flex-1 bg-transparent text-foreground"> {/* flex-1 to grow, flex-col for content + border */}
          <div className={contentWrapperClasses}> {/* This is where children (web-view) go. It's flex-1 */}
            {children}
          </div>
          {/* Bottom decorative border for mobile, always shown if mobile */}
          <div className="md:hidden decorative-border-repeat decorative-border-repeat-h20"></div>
        </main>

        <BottomNav /> {/* Fixed position, overlays if not accounted for */}
      </SidebarInset>
    </SidebarProvider>
  );
}
