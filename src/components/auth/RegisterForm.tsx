
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { siteConfig } from "@/config/site";
import { useAppSettings } from "@/hooks/useAppSettings";
import { db } from "@/lib/firebase"; 
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore"; 

const formSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters."),
  username: z.string().min(3, "Username must be at least 3 characters.").regex(/^[a-zA-Z0-9]+$/, "Username can only contain letters and numbers."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

const RegisterForm = () => {
  const router = useRouter();
  const { toast } = useToast();
  const [ipAddress, setIpAddress] = useState('');
  const [autoGenerateUsername, setAutoGenerateUsername] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      name: "",
      username: "",
      password: "",
    },
  });

  const generateAndSetUsername = useCallback(() => {
    const nameValue = form.getValues("name");
    if (nameValue) {
      const firstName = nameValue.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/gi, ''); 
      const randomNumber = Math.floor(1000 + Math.random() * 9000);
      form.setValue("username", `${firstName}${randomNumber}`, { shouldValidate: true });
    } else {
      form.setValue("username", "", { shouldValidate: true });
    }
  }, [form]);
  
  useEffect(() => {
    if (autoGenerateUsername) {
      generateAndSetUsername();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.watch("name"), autoGenerateUsername, generateAndSetUsername]);

  useEffect(() => {
    const getIpAddress = async () => {
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        if (!response.ok) {
            throw new Error(`Failed to fetch IP: ${response.status}`);
        }
        const data = await response.json();
        setIpAddress(data.ip);
      } catch (error) {
        console.error('Error fetching IP address:', error);
        // Optionally set a fallback or leave ipAddress as ''
        // setIpAddress('IP_FETCH_ERROR'); 
      }
    };
    getIpAddress();
  }, []);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const userDocRef = doc(db, "users", values.username);
      const docSnap = await getDoc(userDocRef);

      if (docSnap.exists()) {
        toast({
          variant: "destructive",
          title: "Registration Failed",
          description: "Username already exists. Please choose a different one or try logging in.",
        });
        setIsSubmitting(false);
        return;
      }

      await setDoc(userDocRef, {
        name: values.name,
        username: values.username,
        password: values.password, // Storing password in PLAINTEXT
        ipAddress: ipAddress || null,
        isAdmin: false,
        isRestricted: false,
        pushNotificationsEnabled: true, // Default to true for new users
        createdAt: Timestamp.now(),
      });

      toast({
        title: "Registration Successful",
        description: "You have successfully registered. Please login.",
      });
      router.push('/login');

    } catch (error: any) {
      console.error('Error registering:', error);
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: error.message || "Something went wrong. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <CardDescription>Create an account to get started</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter a username or let us generate one" {...field} disabled={autoGenerateUsername} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex items-center space-x-2">
              <Checkbox
                id="auto-generate-username"
                checked={autoGenerateUsername}
                onCheckedChange={(checked) => {
                  const isChecked = Boolean(checked);
                   setAutoGenerateUsername(isChecked);
                  if (isChecked) {
                    generateAndSetUsername();
                  } else {
                     form.setValue("username", "", { shouldValidate: true }); 
                  }
                }}
              />
              <label
                htmlFor="auto-generate-username"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Auto Generate Username (from Name)
              </label>
            </div>
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Create a strong password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <input type="hidden" name="ipAddress" value={ipAddress} />
            <Button type="submit" className="w-full" disabled={isSubmitting || isLoadingSettings}>
              {(isSubmitting || (isLoadingSettings && !appSettings)) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Register
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default RegisterForm;
