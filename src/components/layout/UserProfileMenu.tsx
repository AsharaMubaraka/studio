
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
import { LogOut, UserCircle, ChevronDown, Settings, ShieldCheck, BellRing } from "lucide-react"; // Added BellRing
import { ThemeToggleMenuItem } from "./ThemeToggle";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAdminMode } from "@/contexts/AdminModeContext";
import { requestNotificationPermission } from "@/lib/firebase"; // Import the function
import { useToast } from "@/hooks/use-toast";


export function UserProfileMenu() {
  const { user, logout } = useAuth();
  const { isAdminMode, setIsAdminMode } = useAdminMode();
  const { toast } = useToast();

  if (!user) return null;

  const initials = user.username.substring(0, 2).toUpperCase();
  
  const isActualAdmin = !!user?.isAdmin; 

  const handleAdminModeChange = (checked: boolean) => {
    setIsAdminMode(checked);
  };

  const handleEnableNotifications = async () => {
    try {
      const token = await requestNotificationPermission();
      if (token) {
        console.log("FCM Token:", token);
        // You would typically send this token to your server to store it
        toast({
          title: "Notifications Enabled",
          description: "You will now receive push notifications.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Permission Denied",
          description: "Notification permission was not granted.",
        });
      }
    } catch (error) {
      console.error("Error enabling notifications:", error);
      toast({
        variant: "destructive",
        title: "Notification Error",
        description: "Could not enable push notifications. See console for details.",
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 gap-2 px-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src="https://live.lunawadajamaat.org/wp-content/uploads/2025/05/Picsart_25-05-19_18-32-50-677.png" alt={user.username} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="hidden sm:block">
            <p className="font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">({user.username})</p>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50 hidden sm:inline-block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.username} ({user.isAdmin ? "Admin" : "Member"})
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <UserCircle className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <ThemeToggleMenuItem />
        <DropdownMenuItem onClick={handleEnableNotifications}>
          <BellRing className="mr-2 h-4 w-4" />
          <span>Enable Notifications</span>
        </DropdownMenuItem>
        
        {isActualAdmin && ( 
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-sm">
              <div className="flex items-center justify-between">
                <Label htmlFor="admin-mode-toggle" className="flex items-center gap-2 cursor-pointer">
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
        <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
