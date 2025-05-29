
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, UserCircle, ChevronDown, Settings, ShieldCheck } from "lucide-react"; // Added ShieldCheck
import { ThemeToggleMenuItem } from "./ThemeToggle";
import { Switch } from "@/components/ui/switch"; // Added Switch
import { Label } from "@/components/ui/label"; // Added Label
import { useAdminMode } from "@/contexts/AdminModeContext"; // Added useAdminMode

export function UserProfileMenu() {
  const { user, logout } = useAuth();
  const { isAdminMode, toggleAdminMode, setIsAdminMode } = useAdminMode();

  if (!user) return null;

  const initials = user.username.substring(0, 2).toUpperCase();
  
  // Placeholder for actual admin check
  // TODO: Replace this with a proper check from user data (e.g., user.isAdmin)
  const isActualAdmin = user.username === 'admin'; 

  const handleAdminModeChange = (checked: boolean) => {
    setIsAdminMode(checked);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 gap-2 px-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src="https://live.lunawadajamaat.org/wp-content/uploads/2025/05/Picsart_25-05-19_18-32-50-677.png" alt={user.username} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="hidden sm:hidden mobile-user-info">
            <p className="font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">({user.username})</p>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50 hidden sm:inline-block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end" forceMount> {/* Increased width for admin toggle */}
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.username}</p>
            <p className="text-xs leading-none text-muted-foreground">
              Member
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <UserCircle className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <ThemeToggleMenuItem />
        
        {/* Admin Mode Toggle */}
        {/* TODO: Replace `isActualAdmin` with a proper check from user.isAdmin field from Firestore */}
        {isActualAdmin && ( 
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-sm">
              <div className="flex items-center justify-between">
                <Label htmlFor="admin-mode-toggle" className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Admin Mode</span>
                </Label>
                <Switch
                  id="admin-mode-toggle"
                  checked={isAdminMode}
                  onCheckedChange={handleAdminModeChange}
                />
              </div>
            </div>
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive focus:bg-destructive/10">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
