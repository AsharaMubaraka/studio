
"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { BellRing, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { requestNotificationPermission } from "@/lib/firebase";
import { saveUserFcmTokenAction } from "@/actions/userActions";

interface NotificationPermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDialogClose: (permissionGranted: boolean, remindLater?: boolean) => void;
}

export function NotificationPermissionDialog({
  open,
  onOpenChange,
  onDialogClose,
}: NotificationPermissionDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleEnableNotifications = async () => {
    if (!user?.username) {
      toast({ variant: "destructive", title: "Error", description: "User not logged in." });
      onDialogClose(false);
      return;
    }

    setIsProcessing(true);
    try {
      const token = await requestNotificationPermission();
      if (token) {
        const saveResult = await saveUserFcmTokenAction(user.username, token);
        if (saveResult.success) {
          toast({
            title: "Notifications Enabled",
            description: "You'll now receive timely updates!",
          });
          onDialogClose(true); // Permission granted and token saved
        } else {
          toast({
            variant: "destructive",
            title: "Error Saving Token",
            description: saveResult.message || "Could not save notification preferences.",
          });
          onDialogClose(false); // Permission might be granted, but token save failed
        }
      } else {
        // This case handles if Notification.requestPermission() was denied or dismissed by user
        if (Notification.permission === 'denied') {
            toast({
                variant: "destructive",
                title: "Permission Denied",
                description: "You've chosen not to receive notifications at this time.",
            });
            onDialogClose(false); // Permission explicitly denied
        } else { // Permission was 'default' and user closed the browser prompt
            toast({
                title: "Setup Incomplete",
                description: "Notification permission was not granted.",
            });
            onDialogClose(false, true); // User dismissed the browser prompt, remind later
        }
      }
    } catch (error) {
      console.error("Error enabling notifications:", error);
      toast({
        variant: "destructive",
        title: "Notification Error",
        description: "Could not enable push notifications. Please try again from settings.",
      });
      onDialogClose(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNotNow = () => {
    onDialogClose(false, true); // Remind later
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex justify-center mb-4">
            <BellRing className="h-12 w-12 text-primary" />
          </div>
          <AlertDialogTitle className="text-center text-xl">
            Stay Updated!
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            Enable push notifications to receive important announcements and
            timely updates directly on your device.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-col sm:space-x-0 gap-2">
          <Button
            onClick={handleEnableNotifications}
            disabled={isProcessing}
            className="w-full"
          >
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enable Notifications
          </Button>
          <AlertDialogCancel onClick={handleNotNow} className="w-full mt-0" disabled={isProcessing}>
            Not Now
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
