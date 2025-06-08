
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { userNavItems as baseUserNavItems, adminNavItems as baseAdminNavItems, type NavItemConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAdminMode } from "@/contexts/AdminModeContext"; 
import { useAppSettings } from "@/hooks/useAppSettings";
import { useMemo } from "react";

export function BottomNav() {
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const { isAdminMode } = useAdminMode(); 
  const { settings: appSettings, isLoading: isLoadingSettings } = useAppSettings();

  const currentNavItems = useMemo(() => {
    let baseItems = isAdminMode ? baseAdminNavItems : baseUserNavItems;
    if (appSettings && typeof appSettings.showLiveRelayPage === 'boolean' && !appSettings.showLiveRelayPage) {
      baseItems = baseItems.filter(item => item.href !== '/live-relay');
    }
    return baseItems;
  }, [isAdminMode, appSettings]);

  if (!isMobile || isLoadingSettings) { // Don't render if not mobile or settings are still loading
    return null;
  }

  return (
    <nav
      aria-label="Main navigation"
      className="bottom-nav fixed bottom-0 left-0 right-0 z-50 border-t shadow-t-lg md:hidden"
    >
      <div className="flex h-16 items-stretch justify-around">
        {currentNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center p-2 text-center transition-colors",
              "focus:outline-none focus-visible:bg-primary/80"
            )}
            aria-current={(pathname === item.href || (item.href !== "/" && item.href !== "/dashboard" && pathname.startsWith(item.href))) ? "page" : undefined}
          >
            <item.icon className="h-5 w-5" />
            <span className="mt-1 text-xs">{item.title}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

