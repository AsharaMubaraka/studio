
"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { Moon, Sun } from "lucide-react";
import type { DropdownMenuItemProps } from "@radix-ui/react-dropdown-menu";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

export function ThemeToggleMenuItem(props: Omit<DropdownMenuItemProps, 'onClick' | 'children'>) {
  const { theme, toggleTheme } = useTheme();

  return (
    <DropdownMenuItem onClick={toggleTheme} {...props}>
      {theme === 'dark' ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
      <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
    </DropdownMenuItem>
  );
}
