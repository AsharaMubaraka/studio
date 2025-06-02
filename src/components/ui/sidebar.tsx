"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { type VariantProps, cva } from "class-variance-authority";
import { Menu, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  // SheetClose, // Removed unused import
} from "@/components/ui/sheet"; 

// Context for sidebar state
interface SidebarContextProps {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isMobile: boolean;
}

const SidebarContext = React.createContext<SidebarContextProps | undefined>(undefined);

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}

interface SidebarProviderProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function SidebarProvider({
  children,
  defaultOpen = true, 
}: SidebarProviderProps) {
  const isMobile = useIsMobile();
  // Initialize isOpen based on isMobile once isMobile is resolved
  const [isOpen, setIsOpen] = React.useState(() => {
    if (typeof isMobile === 'boolean') {
      return isMobile ? false : defaultOpen;
    }
    // Fallback or initial state before isMobile is determined.
    return defaultOpen; 
  });

  React.useEffect(() => {
    if (typeof isMobile === 'boolean') { // Only run if isMobile is boolean
      if (isMobile) {
        setIsOpen(false); 
      } else {
        setIsOpen(defaultOpen);
      }
    }
  }, [isMobile, defaultOpen]);

  return (
    <SidebarContext.Provider value={{ isOpen, setIsOpen, isMobile }}>
      {children}
    </SidebarContext.Provider>
  );
}

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  ({ className, children, ...props }, ref) => {
    const { isOpen, setIsOpen, isMobile } = useSidebar();

    if (isMobile) {
      // If mobile, do not render any sidebar (Sheet or otherwise)
      return null;
    }

    // Desktop sidebar rendering logic
    const desktopSidebarClasses = cn(
      "fixed inset-y-0 left-0 z-30 flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-300 ease-in-out",
      "w-64", 
      isOpen ? "translate-x-0" : "-translate-x-full",
      className
    );

    return (
      <aside ref={ref} className={desktopSidebarClasses} {...props}>
        {children} 
      </aside>
    );
  }
);
Sidebar.displayName = "Sidebar";

const SidebarTrigger = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, children, ...props }, ref) => {
    const { setIsOpen, isMobile, isOpen } = useSidebar(); 
    
    // The trigger should only be functional if it's not mobile,
    // as AppShell will hide it on mobile.
    if (isMobile) {
        return null; 
    }

    return (
      <Button
        ref={ref}
        variant="ghost"
        size="icon"
        className={cn("text-nav-foreground hover:bg-nav-foreground/10", className)} 
        onClick={() => setIsOpen(!isOpen)} 
        {...props}
      >
        {children || (isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />)}
        <span className="sr-only">{isOpen ? "Close sidebar" : "Open sidebar"}</span>
      </Button>
    );
  }
);
SidebarTrigger.displayName = "SidebarTrigger";

const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-4 border-b border-sidebar-border", className)}
    {...props}
  />
));
SidebarHeader.displayName = "SidebarHeader";


const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { asChild?: boolean }
>(({ className, asChild = false, ...props }, ref) => { 
  const Comp = asChild ? Slot : "div";
  return (
    <Comp
      ref={ref}
      data-sidebar="content" 
      className={cn("flex-1 overflow-y-auto", className)}
      {...props}
    />
  );
});
SidebarContent.displayName = "SidebarContent";

const SidebarMenu = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, ...props }, ref) => (
  <nav
    ref={ref}
    className={cn("flex flex-col gap-1 p-2", className)}
    {...props}
  />
));
SidebarMenu.displayName = "SidebarMenu";

const SidebarMenuItem = React.forwardRef<
  HTMLLIElement,
  React.HTMLAttributes<HTMLLIElement>
>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("list-none", className)} {...props} />
));
SidebarMenuItem.displayName = "SidebarMenuItem";


const sidebarMenuButtonVariants = cva(
  "group flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
  {
    variants: {
      isActive: {
        true: "bg-sidebar-accent text-sidebar-primary hover:bg-sidebar-accent/90",
        false: "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      },
    },
    defaultVariants: {
      isActive: false,
    },
  }
);

interface SidebarMenuButtonProps
  extends ButtonProps,
    VariantProps<typeof sidebarMenuButtonVariants> {
  asChild?: boolean;
  tooltip?: { children: React.ReactNode; hidden?: boolean };
}

const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  SidebarMenuButtonProps
>(({ className, variant, size, isActive, asChild, tooltip, children, ...props }, ref) => {
  const Comp = asChild ? Slot : Button;
  
  const [showTooltip, setShowTooltip] = React.useState(false);
  const { isMobile } = useSidebar(); 

  if (tooltip && !tooltip.hidden && !isMobile) { 
     return (
      <div className="relative">
        <Comp
          ref={ref}
          className={cn(sidebarMenuButtonVariants({ isActive }), className)}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onFocus={() => setShowTooltip(true)}
          onBlur={() => setShowTooltip(false)}
          {...props}
        >
          {children}
        </Comp>
        {showTooltip && (
          <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap rounded bg-neutral-800 px-2 py-1 text-xs text-white shadow-lg dark:bg-neutral-700">
            {tooltip.children}
          </div>
        )}
      </div>
    );
  }

  return (
    <Comp
      ref={ref}
      className={cn(sidebarMenuButtonVariants({ isActive }), className)}
      {...props}
    >
      {children}
    </Comp>
  );
});
SidebarMenuButton.displayName = "SidebarMenuButton";

const SidebarInset = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { isOpen, isMobile } = useSidebar();
  
  const insetClasses = cn(
    "transition-all duration-300 ease-in-out bg-transparent", 
    !isMobile && isOpen && "md:pl-64", 
    !isMobile && !isOpen && "md:pl-0", 
    className
  );

  return (
    <div
      ref={ref}
      data-sidebar="inset"
      className={insetClasses}
      {...props}
    />
  );
});
SidebarInset.displayName = "SidebarInset";

export {
  // useSidebar is already exported above at its definition
  Sidebar,
  SidebarTrigger,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
};
