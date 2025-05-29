
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { userNavItems, adminNavItems, type NavItemConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAdminMode } from "@/contexts/AdminModeContext"; // Added import

export function BottomNav() {
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const { isAdminMode } = useAdminMode(); // Get admin mode

  const currentNavItems = isAdminMode ? adminNavItems : userNavItems;

  if (!isMobile) {
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
