
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Loader2, Settings, Link as LinkIcon, Image as ImageIcon, Youtube } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { updateAppSettingsAction } from "@/actions/settingsActions";
import { appSettingsSchema, type AppSettingsFormValues } from "@/lib/schemas/settingsSchemas";
import { siteConfig } from "@/config/site";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useAppSettings, invalidateAppSettingsCache } from "@/hooks/useAppSettings";

export default function AppSettingsPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const { settings: currentSettings, isLoading: isLoadingSettings, refreshAppSettings } = useAppSettings();

  const form = useForm<AppSettingsFormValues>({
    resolver: zodResolver(appSettingsSchema),
    defaultValues: {
      webViewUrl: "",
      logoUrl: "",
      updateLogoOnLogin: false,
      updateLogoOnSidebar: false,
      updateLogoOnProfileAvatar: false,
      showLiveRelayPage: true,
    },
  });

  const watchedLogoUrl = form.watch("logoUrl");

  useEffect(() => {
    document.title = `App Settings | ${siteConfig.name}`;
  }, []);

  useEffect(() => {
    if (currentSettings && !isLoadingSettings) {
      form.reset({
        webViewUrl: currentSettings.webViewUrl || "",
        logoUrl: currentSettings.logoUrl || "",
        updateLogoOnLogin: currentSettings.logoUrl ? !!currentSettings.updateLogoOnLogin : false,
        updateLogoOnSidebar: currentSettings.logoUrl ? !!currentSettings.updateLogoOnSidebar : false,
        updateLogoOnProfileAvatar: currentSettings.logoUrl ? !!currentSettings.updateLogoOnProfileAvatar : false,
        showLiveRelayPage: typeof currentSettings.showLiveRelayPage === 'boolean' ? currentSettings.showLiveRelayPage : true,
      });
    } else if (!isLoadingSettings && !currentSettings) { 
        form.reset({
            webViewUrl: "",
            logoUrl: "",
            updateLogoOnLogin: false,
            updateLogoOnSidebar: false,
            updateLogoOnProfileAvatar: false,
            showLiveRelayPage: true,
        });
    }
  }, [currentSettings, isLoadingSettings, form]);


  async function onSubmit(values: AppSettingsFormValues) {
    if (!user?.isAdmin) {
      toast({ variant: "destructive", title: "Unauthorized", description: "You are not authorized." });
      return;
    }
    setIsSubmitting(true);
    const result = await updateAppSettingsAction(values);
    if (result.success) {
      toast({ title: "Success", description: result.message });
      invalidateAppSettingsCache(); 
      refreshAppSettings(); 
    } else {
      toast({ variant: "destructive", title: "Error", description: result.message || "Failed to update settings." });
      if (result.errors) {
        Object.entries(result.errors).forEach(([field, errors]) => {
          if (errors && errors.length > 0) {
            form.setError(field as keyof AppSettingsFormValues, { message: errors.join(", ") });
          }
        });
      }
    }
    setIsSubmitting(false);
  }

  if (!isAuthenticated || !user?.isAdmin) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <Card className="shadow-lg p-8 animate-fadeIn w-full max-w-md">
          <CardHeader><CardTitle>Access Denied</CardTitle><CardDescription>You do not have permission to view this page.</CardDescription></CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      <Card className="shadow-lg w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold tracking-tight flex items-center">
            <Settings className="mr-3 h-8 w-8 text-primary" />
            Application Settings
          </CardTitle>
          <CardDescription>
            Manage global settings for the application.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingSettings && !form.formState.isDirty ? ( 
            <div className="space-y-6">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full mb-2" />)}
              <Skeleton className="h-10 w-1/4 mt-6" />
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField control={form.control} name="webViewUrl" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center text-base"><LinkIcon className="mr-2 h-5 w-5" /> Web View URL</FormLabel>
                    <FormControl><Input placeholder="https://example.com" {...field} value={field.value || ""} /></FormControl>
                    <FormDescription>The URL to display in the 'Website' tab. Leave empty to show no page.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
                
                <Separator />
                
                <FormField control={form.control} name="showLiveRelayPage" render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 p-3 border rounded-md">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <div className="space-y-0.5">
                      <FormLabel className="flex items-center text-base"><Youtube className="mr-2 h-5 w-5" /> Show Live Relay Page</FormLabel>
                      <FormDescription>Toggle visibility of the Live Relay page in navigation and access.</FormDescription>
                    </div>
                  </FormItem>
                )} />

                <Separator />

                <div>
                  <FormField control={form.control} name="logoUrl" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center text-base"><ImageIcon className="mr-2 h-5 w-5" /> Application Logo URL</FormLabel>
                      <FormControl><Input placeholder="https://example.com/logo.png" {...field} value={field.value || ""} /></FormControl>
                      <FormDescription>
                        URL for the custom application logo. If empty, a default logo (<code>{siteConfig.defaultLogoUrl}</code>) will be used where selected.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="mt-6 space-y-4 pl-4 border-l-2 border-primary/20">
                    <FormDescription className="mb-2 text-sm font-medium text-foreground">Apply custom logo to:</FormDescription>
                    <FormField control={form.control} name="updateLogoOnLogin" render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={!watchedLogoUrl} /></FormControl>
                        <FormLabel className="font-normal text-sm">Login & Register Pages</FormLabel>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="updateLogoOnSidebar" render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={!watchedLogoUrl} /></FormControl>
                        <FormLabel className="font-normal text-sm">Sidebar</FormLabel>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="updateLogoOnProfileAvatar" render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={!watchedLogoUrl} /></FormControl>
                        <FormLabel className="font-normal text-sm">User Profile Avatar (Header)</FormLabel>
                      </FormItem>
                    )} />
                  </div>
                </div>
                
                <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting || (isLoadingSettings && !form.formState.isDirty) }>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Settings
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

