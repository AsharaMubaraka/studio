"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, User, Hash, Save, KeyRound, ShieldAlert, BellRing } from "lucide-react";
import { updateUserDisplayNameAction, updateUserPasswordAction, updateUserPushNotificationPreferenceAction } from "@/actions/userActions";
import { siteConfig } from "@/config/site";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const profileFormSchema = z.object({
  displayName: z.string().min(2, "Name must be at least 2 characters.").max(100, "Name must be at most 100 characters."),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const passwordChangeFormSchema = z.object({
  currentPassword: z.string().min(1, "Current password cannot be empty."),
  newPassword: z.string().min(6, "New password must be at least 6 characters."),
  confirmNewPassword: z.string().min(6, "Confirm password must be at least 6 characters."),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "New passwords do not match.",
  path: ["confirmNewPassword"],
});

type PasswordChangeFormValues = z.infer<typeof passwordChangeFormSchema>;

export default function ProfilePage() {
  const { user, isLoading: authLoading, updateUserPushPreference } = useAuth();
  const { toast } = useToast();
  const [isSubmittingName, setIsSubmittingName] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [isSubmittingPushPrefs, setIsSubmittingPushPrefs] = useState(false);

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  
  // Local state for push notification toggle, initialized from user context
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(user?.pushNotificationsEnabled ?? true);

  const nameForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: "",
    },
  });

  const passwordForm = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(passwordChangeFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  useEffect(() => {
    document.title = `Your Profile | ${siteConfig.name}`;
  }, []);

  useEffect(() => {
    if (user) {
      nameForm.reset({ displayName: user.name });
      setPushNotificationsEnabled(typeof user.pushNotificationsEnabled === 'boolean' ? user.pushNotificationsEnabled : true);
    }
  }, [user, nameForm]);

  async function onSubmitName(values: ProfileFormValues) {
    if (!user?.username) {
      toast({ variant: "destructive", title: "Error", description: "User not found." });
      return;
    }
    setIsSubmittingName(true);
    const result = await updateUserDisplayNameAction(user.username, values.displayName);
    if (result.success) {
      toast({ title: "Success", description: "Your display name has been updated." });
      // Note: AuthContext doesn't auto-update name, would require re-login or specific context update method
    } else {
      toast({ variant: "destructive", title: "Update Failed", description: result.message || "Could not update display name." });
    }
    setIsSubmittingName(false);
  }

  async function onSubmitPassword(values: PasswordChangeFormValues) {
    if (!user?.username) {
      toast({ variant: "destructive", title: "Error", description: "User not found." });
      return;
    }
    setIsSubmittingPassword(true);
    const result = await updateUserPasswordAction(user.username, values.currentPassword, values.newPassword);
    if (result.success) {
      toast({ title: "Success", description: "Your password has been updated." });
      passwordForm.reset(); 
    } else {
      toast({ variant: "destructive", title: "Update Failed", description: result.message || "Could not update password." });
      if (result.errors) {
        if (result.errors.currentPassword) passwordForm.setError("currentPassword", { message: result.errors.currentPassword[0]});
        if (result.errors.newPassword) passwordForm.setError("newPassword", { message: result.errors.newPassword[0]});
      }
    }
    setIsSubmittingPassword(false);
  }

  const handlePushNotificationToggle = async (isEnabled: boolean) => {
    if (!user?.username) {
      toast({ variant: "destructive", title: "Error", description: "User not found." });
      return;
    }
    setIsSubmittingPushPrefs(true);
    setPushNotificationsEnabled(isEnabled); // Optimistic UI update

    const result = await updateUserPushNotificationPreferenceAction(user.username, isEnabled);
    if (result.success) {
      toast({ title: "Success", description: result.message });
      updateUserPushPreference(isEnabled); // Update AuthContext
    } else {
      toast({ variant: "destructive", title: "Update Failed", description: result.message || "Could not update preference." });
      setPushNotificationsEnabled(!isEnabled); // Revert optimistic UI update
    }
    setIsSubmittingPushPrefs(false);
  };


  if (authLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <Card className="shadow-lg animate-fadeIn w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Profile Not Available</CardTitle>
          <CardDescription>Please log in to view your profile.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      <Card className="shadow-lg w-full max-w-lg mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold tracking-tight flex items-center">
            <User className="mr-3 h-7 w-7 text-primary" />
            Your Profile
          </CardTitle>
          <CardDescription>View and update your account details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username" className="flex items-center text-sm font-medium text-muted-foreground">
              <Hash className="mr-2 h-4 w-4" /> Username
            </Label>
            <Input id="username" value={user.username} readOnly disabled className="bg-muted/50" />
            <p className="text-xs text-muted-foreground">Your username cannot be changed.</p>
          </div>

          <Form {...nameForm}>
            <form onSubmit={nameForm.handleSubmit(onSubmitName)} className="space-y-4">
              <FormField
                control={nameForm.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><User className="mr-2 h-4 w-4" /> Display Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your display name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full sm:w-auto" disabled={isSubmittingName || !nameForm.formState.isDirty}>
                {isSubmittingName ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {isSubmittingName ? "Saving..." : "Save Display Name"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <Card className="shadow-lg w-full max-w-lg mx-auto">
        <CardHeader>
          <CardTitle className="text-xl font-bold tracking-tight flex items-center">
            <BellRing className="mr-3 h-6 w-6 text-primary" />
            Notification Preferences
          </CardTitle>
          <CardDescription>Manage how you receive notifications.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex items-center space-x-3">
                <Switch
                    id="push-notifications-toggle"
                    checked={pushNotificationsEnabled}
                    onCheckedChange={handlePushNotificationToggle}
                    disabled={isSubmittingPushPrefs}
                />
                <Label htmlFor="push-notifications-toggle" className="flex-grow">
                    Enable Push Notifications
                </Label>
                {isSubmittingPushPrefs && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
                Toggle this to enable or disable receiving push notifications from the app on this device. Browser-level permission may also be required.
            </p>
        </CardContent>
      </Card>

      <Card className="shadow-lg w-full max-w-lg mx-auto">
        <CardHeader>
          <CardTitle className="text-xl font-bold tracking-tight flex items-center">
            <KeyRound className="mr-3 h-6 w-6 text-primary" />
            Change Password
          </CardTitle>
          <CardDescription>Update your account password.</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="mb-6">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Security Reminder</AlertTitle>
            <AlertDescription>
              For your security, please choose a strong and unique password that you don&apos;t use for other services.
            </AlertDescription>
          </Alert>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)} className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input type={showCurrentPassword ? "text" : "password"} placeholder="Enter your current password" {...field} />
                      </FormControl>
                       <Button 
                          type="button" variant="ghost" size="icon" 
                          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground" 
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        >
                          {showCurrentPassword ? <User className="h-4 w-4" /> : <User className="h-4 w-4 opacity-50" />} 
                        </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                     <div className="relative">
                      <FormControl>
                        <Input type={showNewPassword ? "text" : "password"} placeholder="Enter new password (min. 6 characters)" {...field} />
                      </FormControl>
                      <Button 
                          type="button" variant="ghost" size="icon" 
                          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground" 
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? <User className="h-4 w-4" /> : <User className="h-4 w-4 opacity-50" />}
                        </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="confirmNewPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <div className="relative">
                    <FormControl>
                      <Input type={showConfirmNewPassword ? "text" : "password"} placeholder="Confirm your new password" {...field} />
                    </FormControl>
                     <Button 
                          type="button" variant="ghost" size="icon" 
                          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground" 
                          onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                        >
                          {showConfirmNewPassword ? <User className="h-4 w-4" /> : <User className="h-4 w-4 opacity-50" />}
                        </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full sm:w-auto" disabled={isSubmittingPassword}>
                {isSubmittingPassword ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {isSubmittingPassword ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}