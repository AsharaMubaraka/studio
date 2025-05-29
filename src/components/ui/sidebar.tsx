
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
  SheetClose,
  SheetContent,
  SheetHeader as ShadcnSheetHeader, // Aliased import
  SheetTitle as ShadcnSheetTitle,   // Aliased import
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
  defaultOpen = false,
}: SidebarProviderProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = React.useState(isMobile ? false : defaultOpen);

  React.useEffect(() => {
    if (isMobile) {
      setIsOpen(false);
    } else {
      setIsOpen(defaultOpen);
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
      return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetContent side="left" className={cn("w-72 bg-sidebar p-0 text-sidebar-foreground shadow-lg", className)} {...props} ref={ref}>
            <ShadcnSheetHeader className="flex items-center justify-between p-2 border-b border-sidebar-border">
              <ShadcnSheetTitle className="sr-only">Main Menu</ShadcnSheetTitle> {/* Visually hidden title for accessibility */}
              <SheetClose asChild>
                <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent">
                  <X className="h-5 w-5" />
                  <span className="sr-only">Close sidebar</span>
                </Button>
              </SheetClose>
            </ShadcnSheetHeader>
            {children}
          </SheetContent>
        </Sheet>
      );
    }

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
    const { setIsOpen, isMobile } = useSidebar();
    
    if (!isMobile) {
      return null;
    }

    return (
      <Button
        ref={ref}
        variant="ghost"
        size="icon"
        className={cn("text-nav-foreground hover:bg-nav-foreground/10", className)}
        onClick={() => setIsOpen(true)}
        {...props}
      >
        {children || <Menu className="h-6 w-6" />}
        <span className="sr-only">Open sidebar</span>
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
>(({ className, asChild = false, ...props }, ref) => { // Default asChild to false
  const Comp = asChild ? Slot : "div";
  return (
    <Comp
      ref={ref}
      data-sidebar="content" // Added to help identify this specific element
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
    "transition-all duration-300 ease-in-out bg-transparent", // Ensure inset area is transparent
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
  Sidebar,
  SidebarTrigger,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
};
