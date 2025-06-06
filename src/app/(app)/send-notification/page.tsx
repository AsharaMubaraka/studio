
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useCallback } from "react";
import { Loader2, MessageSquarePlus, ListChecks, CalendarClock, Trash2, Eye, ImageIcon, Pencil, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { saveNotificationAction, deleteNotificationAction } from "@/actions/notificationActions";
import type { NotificationFormValues } from "@/actions/notificationActions";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs, Timestamp, DocumentData } from "firebase/firestore";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AnnouncementItem, type Announcement } from "@/components/announcements/AnnouncementItem";
import { formatWhatsAppTextToHtml } from "@/lib/utils";
import { siteConfig } from "@/config/site";

const notificationFormSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters.").max(100, "Title must be at most 100 characters."),
  content: z.string().min(2, "Content must be at least 2 characters.").max(5000, "Content must be at most 5000 characters."),
  imageUrl: z.string().url("Must be a valid URL if provided, or leave empty.").optional().or(z.literal('')),
});

interface PostedNotification {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  authorName?: string;
  authorId?: string;
  imageUrl?: string;
  readByUserIds?: string[];
}

export default function SendNotificationPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user: adminUser, isAuthenticated } = useAuth();
  const [editingNotificationId, setEditingNotificationId] = useState<string | null>(null);

  const [postedNotifications, setPostedNotifications] = useState<PostedNotification[]>([]);
  const [isLoadingLog, setIsLoadingLog] = useState(true);
  const [logError, setLogError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const form = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationFormSchema),
    defaultValues: {
      title: "",
      content: "",
      imageUrl: "",
    },
  });

  const { watch, formState: { isDirty } } = form;
  const watchedTitle = watch("title");
  const watchedContent = watch("content");
  const watchedImageUrl = watch("imageUrl");

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirty) {
        event.preventDefault();
        event.returnValue = ''; 
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);

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
          authorId: data.authorId,
          imageUrl: data.imageUrl,
          readByUserIds: (data.readByUserIds as string[] | undefined) || [],
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
    document.title = `Send Notification | ${siteConfig.name}`;
    if (adminUser?.isAdmin) {
      fetchPostedNotifications();
    }
  }, [adminUser, fetchPostedNotifications]);

  const handleEditNotification = (notification: PostedNotification) => {
    setEditingNotificationId(notification.id);
    form.reset({
      title: notification.title,
      content: notification.content,
      imageUrl: notification.imageUrl || "",
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingNotificationId(null);
    form.reset({ title: "", content: "", imageUrl: "" });
  };

  async function onSubmit(values: NotificationFormValues) {
    if (!adminUser?.username || !adminUser?.isAdmin) {
        toast({
            variant: "destructive",
            title: "Unauthorized",
            description: "You are not authorized to perform this action.",
        });
        return;
    }
    setIsSubmitting(true);

    try {
      const result = await saveNotificationAction(
        { title: values.title, content: values.content, imageUrl: values.imageUrl || undefined },
        {id: adminUser.username, name: adminUser.name},
        editingNotificationId || undefined
      );
      if (result.success) {
          toast({
              title: "Success",
              description: result.message,
          });
          form.reset({ title: "", content: "", imageUrl: "" });
          setEditingNotificationId(null);
          fetchPostedNotifications(); 
      } else {
          toast({
              variant: "destructive",
              title: "Error",
              description: result.message,
          });
      }
    } catch (error: any) {
      console.error("Error in onSubmit:", error);
      toast({
        variant: "destructive",
        title: "Submission Error",
        description: error.message || "An unexpected error occurred.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteNotification(notificationId: string) {
    setIsDeleting(notificationId);
    try {
      const result = await deleteNotificationAction(notificationId);
      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
        });
        setPostedNotifications(prev => prev.filter(n => n.id !== notificationId));
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message,
        });
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
      toast({
        variant: "destructive",
        title: "Deletion Error",
        description: "An unexpected error occurred while deleting the notification.",
      });
    } finally {
      setIsDeleting(null);
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

  const previewAnnouncement: Announcement = {
    id: 'preview',
    title: watchedTitle || "Sample Title",
    content: watchedContent || "Sample content for the notification. Supports basic HTML.",
    date: new Date(),
    author: adminUser?.name || "Admin",
    status: 'new', 
    imageUrl: watchedImageUrl || undefined,
    imageHint: watchedTitle ? watchedTitle.split(" ").slice(0,2).join(" ") : "preview image"
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <Card className="shadow-lg w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold tracking-tight flex items-center">
            <MessageSquarePlus className="mr-3 h-8 w-8 text-primary" /> 
            {editingNotificationId ? "Edit Notification" : "Send Notification"}
          </CardTitle>
          <CardDescription>
            {editingNotificationId ? "Modify the details of the existing notification." : "Compose and send a new notification. You can include an image by providing its URL."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notification Title</FormLabel>
                  <FormControl><Input placeholder="Enter notification title" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="content" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notification Content</FormLabel>
                  <FormControl><Textarea placeholder="Enter notification content here..." className="min-h-[150px]" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="imageUrl" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><ImageIcon className="mr-2 h-4 w-4" /> Image URL (Optional)</FormLabel>
                  <FormControl><Input placeholder="https://example.com/image.png" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              
              <div className="flex gap-2">
                <Button type="submit" className="flex-grow" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editingNotificationId ? <Pencil className="mr-2 h-4 w-4" /> : <MessageSquarePlus className="mr-2 h-4 w-4" />)}
                  {isSubmitting ? (editingNotificationId ? "Updating..." : "Sending...") : (editingNotificationId ? "Update Notification" : "Send Notification")}
                </Button>
                {editingNotificationId && (
                  <Button type="button" variant="outline" onClick={handleCancelEdit} disabled={isSubmitting}>
                    <XCircle className="mr-2 h-4 w-4" /> Cancel Edit
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="shadow-lg w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tight flex items-center"><Eye className="mr-3 h-6 w-6 text-primary" /> Live Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <AnnouncementItem announcement={previewAnnouncement} onCardClick={() => {}} />
        </CardContent>
      </Card>

      <Card className="shadow-lg w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tight flex items-center"><ListChecks className="mr-3 h-7 w-7 text-primary" /> Posted Notifications Log</CardTitle>
          <CardDescription>List of all active notifications. Newest first.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingLog ? (
            <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-28 w-full" />)}</div>
          ) : logError ? (
            <div className="p-4 border rounded-md bg-destructive/10 text-destructive"><h4 className="font-semibold mb-1">Error Loading Log</h4><p className="text-sm">{logError}</p></div>
          ) : postedNotifications.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No notifications have been posted yet.</p>
          ) : (
            <div className="space-y-6">
              {postedNotifications.map((notification) => (
                <div key={notification.id} className="p-4 border rounded-lg shadow-sm bg-card">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-grow">
                      <h3 
                        className="font-semibold text-lg mb-1" 
                        dangerouslySetInnerHTML={{ __html: formatWhatsAppTextToHtml(notification.title) }} 
                      />
                      <div className="text-sm text-muted-foreground whitespace-pre-line mb-2" dangerouslySetInnerHTML={{ __html: formatWhatsAppTextToHtml(notification.content) }} />
                      {notification.imageUrl && (<a href={notification.imageUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">View Image</a>)}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-1 items-end sm:items-center shrink-0">
                       <Button variant="ghost" size="icon" className="text-primary hover:bg-primary/10" onClick={() => handleEditNotification(notification)} disabled={isSubmitting || isDeleting === notification.id}>
                         <Pencil className="h-4 w-4" />
                       </Button>
                       <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" disabled={isDeleting === notification.id || isSubmitting}>
                            {isDeleting === notification.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete "{notification.title}".</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteNotification(notification.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  <Separator className="my-2"/>
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <div className="flex items-center"><CalendarClock className="mr-1.5 h-3.5 w-3.5" /> Posted: {format(notification.createdAt, "MMM d, yyyy, h:mm a")} by {notification.authorName || 'Admin'}</div>
                    <span className="italic">Read by: {notification.readByUserIds?.length || 0} user(s)</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    