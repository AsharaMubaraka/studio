
"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { siteConfig, navItems } from "@/config/site";
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
} from "@/components/ui/sidebar";
import { UserProfileMenu } from "./UserProfileMenu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Building2 } from "lucide-react";
import { BottomNav } from "./BottomNav";
import Image from "next/image"; // Import next/image

interface AppShellProps {
  children: ReactNode;
}

function Logo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2 px-2 group-data-[collapsible=icon]:justify-center">
       <Building2 className="h-7 w-7 text-sidebar-primary group-data-[collapsible=icon]:h-6 group-data-[collapsible=icon]:w-6" />
      <span className="text-xl font-bold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
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

const BORDER_IMAGE_URL = "https://misbah.info/wp-content/uploads/2024/03/bottom-border-1.png";

export function AppShell({ children }: AppShellProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar>
        <SidebarHeader className="p-4 border-b border-sidebar-border">
          <Logo />
        </SidebarHeader>
        <SidebarContent asChild>
           <ScrollArea className="h-full">
            <MainNav />
          </ScrollArea>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="appshell-header sticky top-0 z-40 flex h-16 items-center justify-end border-b px-4 shadow-md">
          <UserProfileMenu />
        </header>
        <img
           src={BORDER_IMAGE_URL}
           alt="Decorative Border"
           className="w-full h-auto block" // block to remove extra space under img
           style={{ maxHeight: '30px', objectFit: 'cover' }}
           data-ai-hint="decorative border"
         />
        <main className="flex-1 bg-transparent text-foreground p-4 md:p-6 lg:p-8 pb-20 md:pb-4 lg:pb-8 relative">
           {children}
           {/* Removed border image from absolute bottom of main */}
        </main>
        <img
           src={BORDER_IMAGE_URL}
           alt="Decorative Border"
           className="w-full h-auto block" // block to remove extra space under img
           style={{ maxHeight: '30px', objectFit: 'cover' }}
           data-ai-hint="decorative border"
         />
        <BottomNav />
      </SidebarInset>
    </SidebarProvider>
  );
}
