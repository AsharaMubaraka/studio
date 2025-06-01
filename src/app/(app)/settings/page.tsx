
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useCallback } from "react";
import { Loader2, Settings, Link as LinkIcon, Image as ImageIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { updateAppSettingsAction, fetchAppSettings, appSettingsSchema, type AppSettingsFormValues } from "@/actions/settingsActions";
import { siteConfig } from "@/config/site";
import { Skeleton } from "@/components/ui/skeleton";

export default function AppSettingsPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const { user, isAuthenticated } = useAuth();

  const form = useForm<AppSettingsFormValues>({
    resolver: zodResolver(appSettingsSchema),
    defaultValues: {
      webViewUrl: "",
      logoUrl: "",
    },
  });

  const loadSettings = useCallback(async () => {
    setIsLoadingSettings(true);
    const settings = await fetchAppSettings();
    if (settings) {
      form.reset({
        webViewUrl: settings.webViewUrl || "",
        logoUrl: settings.logoUrl || "",
      });
    } else {
      form.reset({ webViewUrl: "", logoUrl: "" }); // Reset to empty if no settings found
    }
    setIsLoadingSettings(false);
  }, [form]);

  useEffect(() => {
    document.title = `App Settings | ${siteConfig.name}`;
    if (user?.isAdmin) {
      loadSettings();
    }
  }, [user, loadSettings]);

  async function onSubmit(values: AppSettingsFormValues) {
    if (!user?.isAdmin) {
      toast({ variant: "destructive", title: "Unauthorized", description: "You are not authorized." });
      return;
    }
    setIsSubmitting(true);
    const result = await updateAppSettingsAction(values);
    if (result.success) {
      toast({ title: "Success", description: result.message });
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
            Manage global settings for the application, like the Web View URL and main logo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingSettings ? (
            <div className="space-y-6">
              <Skeleton className="h-10 w-1/3" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-10 w-1/3 mt-4" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-10 w-1/4 mt-6" />
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField control={form.control} name="webViewUrl" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center text-base">
                      <LinkIcon className="mr-2 h-5 w-5" /> Web View URL
                    </FormLabel>
                    <FormControl><Input placeholder="https://example.com" {...field} /></FormControl>
                    <FormDescription>The URL to display in the 'Website' tab. Leave empty to show no page.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="logoUrl" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center text-base">
                      <ImageIcon className="mr-2 h-5 w-5" /> Application Logo URL
                    </FormLabel>
                    <FormControl><Input placeholder="https://example.com/logo.png" {...field} /></FormControl>
                    <FormDescription>
                      URL for the main application logo. Upload your logo to a service like Firebase Storage and paste the public URL here.
                      If empty, a default logo (currently: <code>{siteConfig.defaultLogoUrl}</code>) will be used.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting || isLoadingSettings}>
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
