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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters."),
  username: z.string().min(3, "Username must be at least 3 characters."),
  password: z.string().min(6, "Password must be at least 6 characters."),
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
    const firstName = name.split(' ')[0].toLowerCase();
    const randomNumber = Math.floor(Math.random() * 100);
    const generatedUsername = `${firstName}_${randomNumber}`;
    form.setValue("username", generatedUsername);
    setAutoGenerateUsername(false);
  };

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
                    <Input placeholder="username_123" {...field} disabled={autoGenerateUsername} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={autoGenerateUsername}
                  onChange={() => {
                    setAutoGenerateUsername(!autoGenerateUsername);
                    if (!autoGenerateUsername) {
                      form.setValue("username", "");
                    } else {
                      generateUsername();
                    }
                  }}
                  className="h-4 w-4"
                />
                <span>Auto Generate Username</span>
              </label>
              {autoGenerateUsername && (
                <Button type="button" onClick={generateUsername} size="sm">
                  Generate Username
                </Button>
              )}
            </div>
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
