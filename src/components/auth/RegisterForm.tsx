
"use client";

import React, { useState, useEffect } from 'react';
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
import { Checkbox } from "@/components/ui/checkbox"; // Added Checkbox import
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters."),
  username: z.string().min(3, "Username must be at least 3 characters."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  isAdmin: z.boolean().optional().default(false), // Added isAdmin field
});

const RegisterForm = () => {
  const router = useRouter();
  const { toast } = useToast();
  const [ipAddress, setIpAddress] = useState('');
  const [autoGenerateUsername, setAutoGenerateUsername] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      username: "",
      password: "",
      isAdmin: false,
    },
  });

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

  const generateUsername = () => {
    const name = form.getValues("name");
    if (!name) {
        form.setValue("username", ""); // Clear username if name is empty
        return;
    }
    const firstName = name.split(' ')[0].toLowerCase();
    const randomNumber = Math.floor(Math.random() * 1000); // Increased range for uniqueness
    const generatedUsername = `${firstName}${randomNumber}`; // Removed underscore
    form.setValue("username", generatedUsername);
    setAutoGenerateUsername(false); // User has interacted, disable auto-generation unless they check the box again
  };
  
  // Effect to generate username when name changes and auto-generate is checked
  useEffect(() => {
    if (autoGenerateUsername && form.getValues("name")) {
      generateUsername();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.watch("name"), autoGenerateUsername]);


  return (
    <Card className="w-full max-w-md shadow-xl animate-fadeIn">
      <CardHeader className="items-center text-center">
        <Image 
          src="https://live.lunawadajamaat.org/wp-content/uploads/2025/05/Picsart_25-05-19_18-32-50-677.png" 
          alt="Anjuman Hub Logo" 
          width={80} 
          height={80} 
          className="mb-4 rounded-full" 
        />
        <CardTitle className="text-3xl font-bold">Anjuman Hub</CardTitle>
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
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your Name" {...field} />
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
                    <Input placeholder="username123" {...field} disabled={autoGenerateUsername} />
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
                  if (isChecked && form.getValues("name")) {
                    generateUsername();
                  } else if (!isChecked) {
                    form.setValue("username", ""); // Clear username if unchecked
                  }
                }}
              />
              <label
                htmlFor="auto-generate-username"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Auto Generate Username
              </label>
            </div>
             {!autoGenerateUsername && !form.getValues("username") && (
                 <Button type="button" onClick={generateUsername} variant="outline" size="sm" className="w-full">
                    Generate Username Manually
                </Button>
            )}


            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Temporary Admin Toggle */}
            <FormField
              control={form.control}
              name="isAdmin"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Register as Administrator (Temporary)
                    </FormLabel>
                    <FormMessage />
                  </div>
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

