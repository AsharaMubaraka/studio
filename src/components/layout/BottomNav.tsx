
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { navItems } from "@/config/site";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSidebar } from "@/components/ui/sidebar";

export function BottomNav() {
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const { toggleSidebar } = useSidebar();

  if (!isMobile) {
    return null;
  }

  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card text-card-foreground shadow-sm md:hidden"
    >
      <div className="flex h-16 items-stretch justify-around">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center p-2 text-center transition-colors",
              "focus:outline-none focus-visible:bg-accent focus-visible:text-accent-foreground",
              (pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href)))
                ? "text-primary"
                : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
            )}
            aria-current={pathname === item.href ? "page" : undefined}
          >
            <item.icon className="h-5 w-5" />
            <span className="mt-1 text-xs">{item.title}</span>
          </Link>
        ))}
        <button
          onClick={toggleSidebar}
          aria-label="Open menu"
          className={cn(
            "flex flex-1 flex-col items-center justify-center p-2 text-center text-muted-foreground transition-colors",
            "hover:bg-accent/50 hover:text-accent-foreground focus:outline-none focus-visible:bg-accent focus-visible:text-accent-foreground"
          )}
        >
          <Menu className="h-5 w-5" />
          <span className="mt-1 text-xs">Menu</span>
        </button>
      </div>
    </nav>
  );
}
