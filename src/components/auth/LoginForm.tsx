
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Loader2, Eye, EyeOff } from "lucide-react";
import Image from "next/image";
// Removed direct db import as login logic is now in AuthContext calling an API
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { useAppSettings } from "@/hooks/useAppSettings";

const formSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

export function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const { settings: appSettings, isLoading: isLoadingSettings } = useAppSettings();
  const [displayLogoUrl, setDisplayLogoUrl] = useState(siteConfig.defaultLogoUrl);

  useEffect(() => {
    if (!isLoadingSettings) {
      if (appSettings?.logoUrl && appSettings.updateLogoOnLogin) {
        setDisplayLogoUrl(appSettings.logoUrl);
      } else {
        setDisplayLogoUrl(siteConfig.defaultLogoUrl);
      }
    }
  }, [appSettings, isLoadingSettings]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    const result = await login(values.username, values.password);
    setIsSubmitting(false);

    if (result.success && result.user) {
       toast({
          title: "Login Successful",
          description: "Welcome back!",
      });
      // Use user data from login result for redirection query params
      router.push(`/dashboard?name=${encodeURIComponent(result.user.name)}&username=${encodeURIComponent(result.user.username)}`);
    } else {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: result.message || "Invalid username or password.",
      });
    }
  }

  return (
    <Card className="w-full max-w-md shadow-xl animate-fadeIn">
      <CardHeader className="items-center text-center">
        {isLoadingSettings && !displayLogoUrl ? (
            <Loader2 className="h-24 w-24 animate-spin text-primary mb-4" />
        ) : (
            <Image
                src={displayLogoUrl}
                alt={siteConfig.name + " Logo"}
                width={96}
                height={96}
                className="mb-4 rounded-full"
                data-ai-hint="calligraphy logo"
                unoptimized={!!displayLogoUrl?.includes('?') || !!displayLogoUrl?.includes('&')}
                onError={() => setDisplayLogoUrl(siteConfig.defaultLogoUrl)}
                priority 
            />
        )}
        <CardTitle className="text-3xl font-bold">{siteConfig.name}</CardTitle>
        <CardDescription>Sign in to access your account</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="Enter your password" 
                        {...field} 
                        className="pr-10"
                      />
                    </FormControl>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground" 
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isSubmitting || isLoadingSettings}>
              {(isSubmitting || (isLoadingSettings && !appSettings)) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-center pt-4">
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Register
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
