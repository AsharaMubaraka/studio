
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
import { LogOut, UserCircle, ChevronDown, Settings, ShieldCheck, BellRing as BellRingIconLucide, Loader2, User } from "lucide-react"; // Added User icon
import { ThemeToggleMenuItem } from "./ThemeToggle";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAdminMode } from "@/contexts/AdminModeContext";
import { requestNotificationPermission, db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { collection, query, getDocs, DocumentData, Timestamp } from "firebase/firestore";
import Link from "next/link"; 
import { siteConfig } from "@/config/site";
import { useAppSettings } from "@/hooks/useAppSettings";


interface AppNotificationDoc {
  id: string;
  readByUserIds?: string[];
}

export function UserProfileMenu() {
  const { user, logout } = useAuth();
  const { isAdminMode, setIsAdminMode } = useAdminMode();
  const { toast } = useToast();
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  
  const { settings: appSettings, isLoading: isLoadingSettings } = useAppSettings();
  const [displayAvatarUrl, setDisplayAvatarUrl] = useState(siteConfig.defaultLogoUrl);


  useEffect(() => {
    if (!user?.username) {
      setHasUnreadNotifications(false);
      return;
    }

    const fetchNotificationsAndCheckUnread = async () => {
      try {
        const notificationsRef = collection(db, "notifications");
        const q = query(notificationsRef);
        const querySnapshot = await getDocs(q);
        
        let unreadFound = false;
        for (const docSnap of querySnapshot.docs) {
          const notification = docSnap.data() as DocumentData;
          const readBy = (notification.readByUserIds as string[] | undefined) || [];
          if (!readBy.includes(user.username)) {
            unreadFound = true;
            break; 
          }
        }
        setHasUnreadNotifications(unreadFound);
      } catch (error) {
        console.error("Error fetching notifications for unread check:", error);
        setHasUnreadNotifications(false); 
      }
    };

    fetchNotificationsAndCheckUnread();
  }, [user]);

  useEffect(() => {
    if (!isLoadingSettings) {
      if (appSettings?.logoUrl && appSettings.updateLogoOnProfileAvatar) {
        setDisplayAvatarUrl(appSettings.logoUrl);
      } else {
        setDisplayAvatarUrl(siteConfig.defaultLogoUrl);
      }
    }
  }, [appSettings, isLoadingSettings]);


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
    <div className="flex items-center gap-2">
      <Link href="/announcements" passHref>
        <Button variant="ghost" size="icon" className="relative text-nav-foreground hover:bg-nav-foreground/10">
          <BellRingIconLucide className="h-5 w-5" />
          {hasUnreadNotifications && (
            <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-auto gap-2 px-2 py-1"> {/* Adjusted padding and height */}
            {isLoadingSettings ? (
              <Loader2 className="h-12 w-12 animate-spin" /> 
            ) : (
              <Avatar className="h-12 w-12"> {/* Increased size */}
                <AvatarImage src={displayAvatarUrl} alt={user.username} onError={() => setDisplayAvatarUrl(siteConfig.defaultLogoUrl)} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            )}
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
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link href="/profile">
              <User className="mr-2 h-4 w-4" />
              <span>Your Profile</span>
            </Link>
          </DropdownMenuItem>
          <ThemeToggleMenuItem />
          <DropdownMenuItem onClick={handleEnableNotifications}>
            <BellRingIconLucide className="mr-2 h-4 w-4" />
            <span>Enable Push Notifications</span>
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
    </div>
  );
}
