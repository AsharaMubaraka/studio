
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "@/config/site";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

export function BottomNav() {
  const isMobile = useIsMobile();
  const pathname = usePathname();

  if (!isMobile) {
    return null;
  }

  return (
    <nav
      aria-label="Main navigation"
      className="bottom-nav fixed bottom-0 left-0 right-0 z-50 border-t shadow-t-lg md:hidden"
    >
      <div className="flex h-16 items-stretch justify-around">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center p-2 text-center transition-colors",
              "focus:outline-none focus-visible:bg-primary/80"
              // Active/hover states are now handled by .bottom-nav styles in globals.css
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
