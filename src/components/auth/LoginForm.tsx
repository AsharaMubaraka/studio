
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
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
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
  const [isSubmitting, setIsSubmitting] = useState(false); // Renamed isLoading to isSubmitting for clarity
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
    try {
      const userDocRef = doc(db, "users", values.username);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: "Invalid username or password.",
        });
        setIsSubmitting(false);
        return;
      }

      const user = userDocSnap.data();

      if (user.password !== values.password) {
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: "Invalid username or password.",
        });
        setIsSubmitting(false);
        return;
      }

      if (user.isRestricted) {
        toast({
          variant: "destructive",
          title: "Login Restricted",
          description: "Your account is currently restricted. Please contact support.",
        });
        setIsSubmitting(false);
        return;
      }

      const success = await login(values.username, values.password);
      setIsSubmitting(false);
      if (success) {
         toast({
            title: "Login Successful",
            description: "Welcome back!",
        });
        router.push(`/dashboard?name=${user.name}&username=${user.username}`);
      } else {
        // Specific error for failed login (e.g. restricted) already handled by login function or above checks
        // If login() itself returns false for other reasons (should be rare if checks pass):
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: "An unexpected error occurred during login. Please check credentials or contact support if restriction persists.",
        });
      }
    } catch (error) {
      console.error("Error logging in:", error);
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "Something went wrong. Please try again.",
      });
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-md shadow-xl animate-fadeIn">
      <CardHeader className="items-center text-center">
        {isLoadingSettings && !displayLogoUrl ? (
            <Loader2 className="h-20 w-20 animate-spin text-primary mb-4" />
        ) : (
            <Image
                src={displayLogoUrl}
                alt={siteConfig.name + " Logo"}
                width={80}
                height={80}
                className="mb-4 rounded-full"
                data-ai-hint="calligraphy logo"
                unoptimized={!!displayLogoUrl?.includes('?') || !!displayLogoUrl?.includes('&')}
                onError={() => setDisplayLogoUrl(siteConfig.defaultLogoUrl)}
                priority // Preload logo on login page
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
