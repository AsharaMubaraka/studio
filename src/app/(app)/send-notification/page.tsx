
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
import { useState, useEffect, useCallback } from "react";
import { Loader2, MessageSquarePlus, Info, ListChecks, CalendarClock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { saveNotificationAction, type NotificationFormValues } from "@/actions/notificationActions";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs, Timestamp, DocumentData } from "firebase/firestore";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

// Schema for client-side form validation
const notificationFormSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters.").max(100, "Title must be at most 100 characters."),
  content: z.string().min(10, "Content must be at least 10 characters.").max(1000, "Content must be at most 1000 characters."),
});

interface PostedNotification {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  authorName?: string;
}

export default function SendNotificationPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user: adminUser, isAuthenticated } = useAuth();

  const [postedNotifications, setPostedNotifications] = useState<PostedNotification[]>([]);
  const [isLoadingLog, setIsLoadingLog] = useState(true);
  const [logError, setLogError] = useState<string | null>(null);

  const form = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationFormSchema),
    defaultValues: {
      title: "",
      content: "",
    },
  });

  const fetchPostedNotifications = useCallback(async () => {
    setIsLoadingLog(true);
    setLogError(null);
    try {
      const notificationsRef = collection(db, "notifications");
      const q = query(notificationsRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const fetchedNotifications = querySnapshot.docs.map((doc) => {
        const data = doc.data() as DocumentData;
        return {
          id: doc.id,
          title: data.title || "No Title",
          content: data.content || "No Content",
          createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
          authorName: data.authorName,
        };
      });
      setPostedNotifications(fetchedNotifications);
    } catch (error) {
      console.error("Error fetching posted notifications:", error);
      setLogError("Failed to load notification log. Please try again later.");
    } finally {
      setIsLoadingLog(false);
    }
  }, []);

  useEffect(() => {
    document.title = "Send Notification | Anjuman Hub";
    if (adminUser?.isAdmin) {
      fetchPostedNotifications();
    }
  }, [adminUser, fetchPostedNotifications]);

  async function onSubmit(values: NotificationFormValues) {
    if (!adminUser?.username || !adminUser?.isAdmin) {
        toast({
            variant: "destructive",
            title: "Unauthorized",
            description: "You are not authorized to send notifications.",
        });
        return;
    }
    setIsSubmitting(true);
    try {
        const result = await saveNotificationAction(values, {id: adminUser.username, name: adminUser.name});
        if (result.success) {
            toast({
                title: "Success",
                description: result.message,
            });
            form.reset();
            fetchPostedNotifications(); // Refresh the log after sending
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
      setIsSubmitting(false);
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
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
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

      <Card className="shadow-lg w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold tracking-tight flex items-center">
            <ListChecks className="mr-3 h-7 w-7 text-primary" /> Posted Notifications Log
          </CardTitle>
          <CardDescription>
            List of all active notifications. Newest first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingLog ? (
            <div className="space-y-4">
              {[1,2,3].map(i => (
                <div key={i} className="p-4 border rounded-md space-y-2 bg-muted/50">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-3 w-1/2 mt-1" />
                </div>
              ))}
            </div>
          ) : logError ? (
            <Alert variant="destructive">
              <Info className="h-4 w-4" />
              <AlertTitle>Error Loading Log</AlertTitle>
              <AlertDescription>{logError}</AlertDescription>
            </Alert>
          ) : postedNotifications.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No notifications have been posted yet.</p>
          ) : (
            <div className="space-y-6">
              {postedNotifications.map((notification) => (
                <div key={notification.id} className="p-4 border rounded-lg shadow-sm bg-card">
                  <h3 className="font-semibold text-lg mb-1">{notification.title}</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-line mb-2">{notification.content}</p>
                  <Separator className="my-2"/>
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <div className="flex items-center">
                      <CalendarClock className="mr-1.5 h-3.5 w-3.5" />
                       Posted: {format(notification.createdAt, "MMM d, yyyy, h:mm a")} by {notification.authorName || 'Admin'}
                    </div>
                    <span className="italic">Read by: (Tracking not implemented)</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

       <Alert variant="default" className="max-w-2xl mx-auto shadow-md">
          <Info className="h-4 w-4" />
          <AlertTitle>Developer Note: Backend Implementation Required</AlertTitle>
          <AlertDescription>
            Saving notifications to Firestore (as done by the form above) is the first step.
            The "Time Sent" for each notification is its creation timestamp in Firestore, visible in the log and the database.
            <br /><br />
            To actually send **push notifications** via Firebase Cloud Messaging (FCM) to user devices, you will need to set up backend logic (e.g., a Cloud Function) that triggers when a new document is added to the 'notifications' collection. That function would then use the Firebase Admin SDK to send messages to all subscribed users.
            <br /><br />
            Similarly, tracking detailed **notification read logs** (like "how many users read it") also requires significant backend implementation for data collection, storage, and aggregation. The "Read by" status in the log above is a placeholder.
          </AlertDescription>
        </Alert>
    </div>
  );
}

    