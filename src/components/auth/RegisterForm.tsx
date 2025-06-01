
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import axios from 'axios';
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
import { fetchAppSettings, type AppSettings } from "@/actions/settingsActions";

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
  const [isLoading, setIsLoading] = useState(false);
  const [displayLogoUrl, setDisplayLogoUrl] = useState(siteConfig.defaultLogoUrl);

  useEffect(() => {
    fetchAppSettings().then(settings => {
      if (settings?.logoUrl && settings.updateLogoOnLogin) {
        setDisplayLogoUrl(settings.logoUrl);
      } else {
        setDisplayLogoUrl(siteConfig.defaultLogoUrl);
      }
    }).catch(() => {
        setDisplayLogoUrl(siteConfig.defaultLogoUrl);
    });
  }, []);

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
      const randomNumber = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
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
        const response = await axios.get('https://api.ipify.org?format=json');
        setIpAddress(response.data.ip);
      } catch (error) {
        console.error('Error fetching IP address:', error);
      }
    };
    getIpAddress();
  }, []);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      const response = await axios.post('/api/register', {
        ...values,
        ipAddress,
        isAdmin: false, 
      });

      if (response.status === 201) {
        toast({
          title: "Registration Successful",
          description: "You have successfully registered.",
        });
        router.push('/login');
      } else {
        toast({
          variant: "destructive",
          title: "Registration Failed",
          description: response.data.error || "Something went wrong. Please try again.",
        });
      }
    } catch (error: any) {
      console.error('Error registering:', error);
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: error.response?.data?.error || "Something went wrong. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-xl animate-fadeIn">
      <CardHeader className="items-center text-center">
        <Image 
          src={displayLogoUrl}
          alt={siteConfig.name + " Logo"}
          width={80} 
          height={80} 
          className="mb-4 rounded-full" 
          data-ai-hint="calligraphy logo"
          unoptimized={!!displayLogoUrl.includes('?') || !!displayLogoUrl.includes('&')}
          onError={() => setDisplayLogoUrl(siteConfig.defaultLogoUrl)}
        />
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
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Register
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default RegisterForm;
