
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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Loader2, MessageSquarePlus, Info } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { saveNotificationAction, type NotificationFormValues } from "@/actions/notificationActions";

// Schema for client-side form validation
const notificationFormSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters.").max(100, "Title must be at most 100 characters."),
  content: z.string().min(10, "Content must be at least 10 characters.").max(1000, "Content must be at most 1000 characters."),
});

export default function SendNotificationPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const { user: adminUser, isAuthenticated } = useAuth();

  useEffect(() => {
    document.title = "Send Notification | Anjuman Hub";
  }, []);

  const form = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationFormSchema),
    defaultValues: {
      title: "",
      content: "",
    },
  });

  async function onSubmit(values: NotificationFormValues) {
    if (!adminUser?.username || !adminUser?.isAdmin) {
        toast({
            variant: "destructive",
            title: "Unauthorized",
            description: "You are not authorized to send notifications.",
        });
        return;
    }
    setIsLoading(true);
    try {
        const result = await saveNotificationAction(values, {id: adminUser.username, name: adminUser.name});
        if (result.success) {
            toast({
                title: "Success",
                description: result.message,
            });
            form.reset();
        } else {
            toast({
                variant: "destructive",
                title: "Error",
                description: result.message,
            });
        }
    } catch (error) {
      console.error("Error in onSubmit calling Server Action:", error);
      toast({
        variant: "destructive",
        title: "Submission Error",
        description: "An unexpected error occurred while sending the notification.",
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  if (!isAuthenticated || !adminUser?.isAdmin) {
    return (
        <div className="flex flex-1 items-center justify-center p-4">
            <Card className="shadow-lg p-8 animate-fadeIn w-full max-w-md">
                <CardHeader>
                    <CardTitle>Access Denied</CardTitle>
                    <CardDescription>You do not have permission to view this page.</CardDescription>
                </CardHeader>
            </Card>
        </div>
    )
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      <Card className="shadow-lg w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-3xl font-bold tracking-tight flex items-center">
            <MessageSquarePlus className="mr-3 h-8 w-8 text-primary" /> Send Notification
          </CardTitle>
          <CardDescription>
            Compose and send a new notification. This will save the notification to Firestore.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notification Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter notification title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notification Content</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter notification content here..."
                        className="min-h-[150px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <MessageSquarePlus className="mr-2 h-4 w-4" />
                )}
                Save Notification
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
       <Alert variant="default" className="max-w-2xl mx-auto shadow-md">
          <Info className="h-4 w-4" />
          <AlertTitle>Developer Note: Backend Implementation Required</AlertTitle>
          <AlertDescription>
            Saving this notification to Firestore is the first step. The "Time Sent" for each notification is its creation timestamp in Firestore, visible in the Notifications list and the database.
            <br /><br />
            To actually send **push notifications** via Firebase Cloud Messaging (FCM) to user devices, you will need to set up backend logic (e.g., a Cloud Function) that triggers when a new document is added to the 'notifications' collection. That function would then use the Firebase Admin SDK to send messages to all subscribed users.
            <br /><br />
            Similarly, tracking detailed **notification logs** (like "how many users read it") also requires significant backend implementation for data collection, storage, and aggregation.
          </AlertDescription>
        </Alert>
    </div>
  );
}
