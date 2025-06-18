
"use client";

import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useIsMobile } from "@/hooks/use-mobile";
import { SidebarProvider } from "@/components/ui/sidebar";

// This layout is for the public downloads page.
// It uses AppShell for consistent UI but does NOT enforce authentication.

export default function PublicDownloadsLayout({ children }: { children: ReactNode }) {
  const isMobileInitial = useIsMobile();
  // For public pages, sidebar might be less relevant or always closed by default on desktop
  const defaultOpen = typeof isMobileInitial === 'boolean' ? !isMobileInitial : true; 

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppShell>
        {children}
      </AppShell>
    </SidebarProvider>
  );
}
