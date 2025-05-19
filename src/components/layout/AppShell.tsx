
"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { siteConfig, navItems, type NavItem } from "@/config/site";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  // SidebarTrigger, // Removed as it's no longer used in the header for mobile
  SidebarInset,
  useSidebar,
} from "@/components/ui/sidebar";
// import { Button } from "@/components/ui/button"; // No longer needed if SidebarTrigger is removed
import { UserProfileMenu } from "./UserProfileMenu";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";
import { Building2 } from "lucide-react";
import { BottomNav } from "./BottomNav";

interface AppShellProps {
  children: ReactNode;
}

function Logo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2 px-2 group-data-[collapsible=icon]:justify-center">
       <Building2 className="h-7 w-7 text-primary group-data-[collapsible=icon]:h-6 group-data-[collapsible=icon]:w-6" />
      <span className="text-xl font-bold text-primary group-data-[collapsible=icon]:hidden">
        {siteConfig.name}
      </span>
    </Link>
  );
}


function MainNav() {
  const pathname = usePathname();
  const { isMobile } = useSidebar();

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))}
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
  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar>
        <SidebarHeader className="p-4">
          <Logo />
        </SidebarHeader>
        <SidebarContent asChild>
           <ScrollArea className="h-full">
            <MainNav />
          </ScrollArea>
        </SidebarContent>
      </Sidebar>
      <SidebarInset> {/* This is now a div */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-end border-b bg-background/80 px-4 backdrop-blur-sm">
          {/* <SidebarTrigger className="md:hidden" />  Removed: mobile trigger is now in BottomNav */}
          <UserProfileMenu />
        </header>
        <main className="flex-1 p-4 pb-20 sm:p-6 lg:p-8 md:pb-6 lg:pb-8"> {/* Added padding-bottom for BottomNav on mobile */}
           {children}
        </main>
        <BottomNav />
      </SidebarInset>
    </SidebarProvider>
  );
}
