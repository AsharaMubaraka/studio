
"use client";

import type { ReactNode } from "react";
import { AppShell } from '@/components/layout/AppShell';
import { SidebarProvider } from "@/components/ui/sidebar"; 
import { useIsMobile } from "@/hooks/use-mobile";

// This layout is specifically for the public /downloads page.
// It uses AppShell for consistent UI but does NOT enforce authentication.
export default function DownloadsLayout({ children }: { children: ReactNode }) {
  const isMobileInitial = useIsMobile(); 
  // Set defaultOpen based on initial mobile state; true for desktop, false for mobile.
  const defaultOpen = typeof isMobileInitial === 'boolean' ? !isMobileInitial : true;

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppShell>
        {children}
      </AppShell>
    </SidebarProvider>
  );
}
