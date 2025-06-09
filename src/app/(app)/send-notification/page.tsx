
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
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useCallback } from "react";
import { Loader2, MessageSquarePlus, ListChecks, CalendarClock, Trash2, Eye, ImageIcon, Pencil, XCircle, Tag, CalendarIcon, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { saveNotificationAction, deleteNotificationAction } from "@/actions/notificationActions";
// type NotificationFormValues from actions is for client-side form, not direct submission
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs, Timestamp, DocumentData } from "firebase/firestore";
import { format, parseISO } from "date-fns";
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
import { formatWhatsAppTextToHtml, cn } from "@/lib/utils";
import { siteConfig, notificationCategories, type NotificationCategory } from "@/config/site";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const notificationFormSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters.").max(100, "Title must be at most 100 characters."),
  content: z.string().min(2, "Content must be at least 2 characters.").max(5000, "Content must be at most 5000 characters."),
  imageUrl: z.string().url("Must be a valid URL if provided, or leave empty.").or(z.literal('')).optional(),
  category: z.enum(notificationCategories).default("General").describe("The category of the notification."),
  isScheduled: z.boolean().optional().default(false),
  scheduledDate: z.string().optional(), // YYYY-MM-DD format
  scheduledTime: z.string().optional(), // HH:MM format
}).superRefine((data, ctx) => {
  if (data.isScheduled) {
    if (!data.scheduledDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["scheduledDate"], message: "Scheduled date is required." });
    }
    if (!data.scheduledTime) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["scheduledTime"], message: "Scheduled time is required." });
    }
    if (data.scheduledDate && data.scheduledTime) {
      try {
        const scheduledDateTime = new Date(`${data.scheduledDate}T${data.scheduledTime}:00`); // Ensure seconds are added for valid Date
        if (isNaN(scheduledDateTime.getTime())) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["scheduledDate"], message: "Invalid date or time." });
        }
      } catch (e) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["scheduledDate"], message: "Invalid date/time format." });
      }
    }
  }
});

type FormValues = z.infer<typeof notificationFormSchema>;


interface PostedNotification {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  authorName?: string;
  authorId?: string;
  imageUrl?: string;
  category?: NotificationCategory;
  readByUserIds?: string[];
  scheduledAt?: Date | null;
  status?: 'draft' | 'scheduled' | 'sent';
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


  const form = useForm<FormValues>({
    resolver: zodResolver(notificationFormSchema),
    defaultValues: {
      title: "",
      content: "",
      imageUrl: "",
      category: "General",
      isScheduled: false,
      scheduledDate: undefined,
      scheduledTime: undefined,
    },
  });

  const { watch, setValue, formState: { isDirty } } = form;
  const watchedTitle = watch("title");
  const watchedContent = watch("content");
  const watchedImageUrl = watch("imageUrl");
  const watchedCategory = watch("category");
  const watchedIsScheduled = watch("isScheduled");
  const watchedScheduledDate = watch("scheduledDate");
  const watchedScheduledTime = watch("scheduledTime");

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const fetchPostedNotifications = useCallback(async () => {
    setIsLoadingLog(true); setLogError(null);
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
          category: data.category || "General",
          readByUserIds: (data.readByUserIds as string[] | undefined) || [],
          scheduledAt: (data.scheduledAt as Timestamp)?.toDate() || null,
          status: data.status || 'sent',
        };
      });
      setPostedNotifications(fetchedNotifications);
    } catch (error) {
      console.error("Error fetching posted notifications:", error);
      setLogError("Failed to load notification log. Please try again.");
    } finally {
      setIsLoadingLog(false);
    }
  }, []);

  useEffect(() => {
    document.title = `Send Notification | ${siteConfig.name}`;
    if (adminUser?.isAdmin) fetchPostedNotifications();
  }, [adminUser, fetchPostedNotifications]);

  const handleEditNotification = (notification: PostedNotification) => {
    setEditingNotificationId(notification.id);
    form.reset({
      title: notification.title,
      content: notification.content,
      imageUrl: notification.imageUrl || "",
      category: notification.category || "General",
      isScheduled: !!notification.scheduledAt,
      scheduledDate: notification.scheduledAt ? format(notification.scheduledAt, "yyyy-MM-dd") : undefined,
      scheduledTime: notification.scheduledAt ? format(notification.scheduledAt, "HH:mm") : undefined,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingNotificationId(null);
    form.reset({ title: "", content: "", imageUrl: "", category: "General", isScheduled: false, scheduledDate: undefined, scheduledTime: undefined });
  };

  async function onSubmit(values: FormValues) {
    if (!adminUser?.username || !adminUser?.isAdmin) {
        toast({ variant: "destructive", title: "Unauthorized", description: "You are not authorized." });
        return;
    }
    setIsSubmitting(true);

    let scheduledAtDateTime: Date | null = null;
    if (values.isScheduled && values.scheduledDate && values.scheduledTime) {
      try {
        scheduledAtDateTime = new Date(`${values.scheduledDate}T${values.scheduledTime}:00`);
        if (isNaN(scheduledAtDateTime.getTime())) throw new Error("Invalid date/time combination");
      } catch (e) {
        toast({ variant: "destructive", title: "Invalid Schedule Time", description: "Please enter a valid date and time for scheduling."});
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const result = await saveNotificationAction(
        {
          title: values.title,
          content: values.content,
          imageUrl: values.imageUrl || undefined,
          category: values.category,
          scheduledAt: scheduledAtDateTime
        },
        // Ensure authorName is "Admin" if sent from this page (which requires admin)
        {id: adminUser.username, name: "Admin"},
        editingNotificationId || undefined
      );
      if (result.success) {
          toast({ title: "Success", description: result.message });
          form.reset({ title: "", content: "", imageUrl: "", category: "General", isScheduled: false, scheduledDate: undefined, scheduledTime: undefined });
          setEditingNotificationId(null);
          fetchPostedNotifications();
      } else {
          toast({ variant: "destructive", title: "Error", description: result.message });
      }
    } catch (error: any) {
      console.error("Error in onSubmit:", error);
      toast({ variant: "destructive", title: "Submission Error", description: error.message || "An unexpected error occurred." });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteNotification(notificationId: string) {
    setIsDeleting(notificationId);
    try {
      const result = await deleteNotificationAction(notificationId);
      if (result.success) {
        toast({ title: "Success", description: result.message });
        setPostedNotifications(prev => prev.filter(n => n.id !== notificationId));
      } else {
        toast({ variant: "destructive", title: "Error", description: result.message });
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
      toast({ variant: "destructive", title: "Deletion Error", description: "An unexpected error occurred while deleting the notification." });
    } finally {
      setIsDeleting(null);
    }
  }


  if (!isAuthenticated || !adminUser?.isAdmin) {
    return (<div className="flex flex-1 items-center justify-center p-4"><Card className="shadow-lg p-8 animate-fadeIn w-full max-w-md"><CardHeader><CardTitle>Access Denied</CardTitle><CardDescription>You do not have permission.</CardDescription></CardHeader></Card></div>);
  }

  let previewStatus: Announcement['status'] = 'new';
  if (watchedIsScheduled && watchedScheduledDate && watchedScheduledTime) {
    try {
        const scheduledDT = new Date(`${watchedScheduledDate}T${watchedScheduledTime}:00`);
        if (scheduledDT > new Date()) {
            previewStatus = 'scheduled' as any;
        }
    } catch (e) { /* ignore parsing error for preview */ }
  }


  const previewAnnouncement: Announcement = {
    id: 'preview',
    title: watchedTitle || "Sample Title",
    content: watchedContent || "Sample content for the notification.",
    date: new Date(),
    author: "Admin", // Preview will always show Admin as author
    status: previewStatus,
    imageUrl: watchedImageUrl || undefined,
    imageHint: watchedTitle ? watchedTitle.split(" ").slice(0,2).join(" ") : "preview image",
    category: watchedCategory || "General",
    scheduledAt: (watchedIsScheduled && watchedScheduledDate && watchedScheduledTime) ? new Date(`${watchedScheduledDate}T${watchedScheduledTime}:00`) : undefined,
    internalStatus: (watchedIsScheduled && watchedScheduledDate && watchedScheduledTime) ? 'scheduled' : 'sent',
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
            {editingNotificationId ? "Modify the details of the existing notification." : "Compose and send or schedule a new notification."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="Notification title" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="content" render={({ field }) => (<FormItem><FormLabel>Content</FormLabel><FormControl><Textarea placeholder="Notification content..." className="min-h-[150px]" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="category" render={({ field }) => (<FormItem><FormLabel className="flex items-center"><Tag className="mr-2 h-4 w-4" /> Category</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger></FormControl><SelectContent>{notificationCategories.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />

              <Separator />
              <div>
                <FormLabel className="text-base font-medium">Notification Image</FormLabel>
                <FormField control={form.control} name="imageUrl" render={({ field }) => (<FormItem className="mt-2"><FormLabel className="flex items-center text-sm"><ImageIcon className="mr-2 h-4 w-4" /> Image URL (Optional)</FormLabel><FormControl><Input placeholder="https://example.com/image.png" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>

              <Separator />
              <div>
                <FormLabel className="text-base font-medium flex items-center"><CalendarClock className="mr-2 h-5 w-5"/> Scheduling</FormLabel>
                 <FormField control={form.control} name="isScheduled" render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 mt-2">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        <div className="space-y-1 leading-none"><FormLabel>Schedule this notification for later</FormLabel></div>
                    </FormItem>
                )} />
                {watchedIsScheduled && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pl-2 border-l-2 border-primary/20 ml-2">
                        <FormField control={form.control} name="scheduledDate" render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Scheduled Date</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {field.value ? format(parseISO(field.value), "PPP") : <span>Pick a date</span>}
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={field.value ? parseISO(field.value) : undefined} onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : undefined)} initialFocus />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="scheduledTime" render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Scheduled Time</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Input type="time" className="w-full pl-8" {...field} />
                                        <Clock className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                )}
              </div>

              <Separator />
              <div className="flex gap-2">
                <Button type="submit" className="flex-grow" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editingNotificationId ? <Pencil className="mr-2 h-4 w-4" /> : <MessageSquarePlus className="mr-2 h-4 w-4" />)} {isSubmitting ? (editingNotificationId ? "Updating..." : (watchedIsScheduled ? "Scheduling..." : "Sending...")) : (editingNotificationId ? "Update Notification" : (watchedIsScheduled ? "Schedule Notification" : "Send Now"))}</Button>
                {editingNotificationId && (<Button type="button" variant="outline" onClick={handleCancelEdit} disabled={isSubmitting}><XCircle className="mr-2 h-4 w-4" /> Cancel Edit</Button>)}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="shadow-lg w-full max-w-2xl mx-auto">
        <CardHeader><CardTitle className="text-xl font-semibold tracking-tight flex items-center"><Eye className="mr-3 h-6 w-6 text-primary" /> Live Preview</CardTitle></CardHeader>
        <CardContent><AnnouncementItem announcement={previewAnnouncement} onCardClick={() => {}} /></CardContent>
      </Card>

      <Card className="shadow-lg w-full max-w-2xl mx-auto">
        <CardHeader><CardTitle className="text-xl font-semibold tracking-tight flex items-center"><ListChecks className="mr-3 h-7 w-7 text-primary" /> Posted Notifications Log</CardTitle><CardDescription>List of all notifications. Newest first.</CardDescription></CardHeader>
        <CardContent>
          {isLoadingLog ? (<div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-28 w-full" />)}</div>)
           : logError ? (<div className="p-4 border rounded-md bg-destructive/10 text-destructive"><h4 className="font-semibold mb-1">Error</h4><p className="text-sm">{logError}</p></div>)
           : postedNotifications.length === 0 ? (<p className="text-muted-foreground text-center py-4">No notifications yet.</p>)
           : (<div className="space-y-6">
              {postedNotifications.map((notification) => {
                const nowAdmin = new Date();
                const isPastScheduled = notification.status === 'scheduled' && notification.scheduledAt && notification.scheduledAt <= nowAdmin;
                const displayStatus = isPastScheduled ? 'sent' : notification.status;
                let displayStatusText = notification.status ? notification.status.charAt(0).toUpperCase() + notification.status.slice(1) : 'Sent';
                if (isPastScheduled) displayStatusText = 'Sent (from Scheduled)';


                return (
                  <div key={notification.id} className="p-4 border rounded-lg shadow-sm bg-card">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-grow">
                        <h3 className="font-semibold text-lg mb-1" dangerouslySetInnerHTML={{ __html: formatWhatsAppTextToHtml(notification.title) }} />
                        <div className="text-xs text-muted-foreground mb-1 space-x-2">
                          <span>Category: <span className="font-medium text-primary">{notification.category || "General"}</span></span>
                          <span>Status: <span className="font-medium" style={{color: displayStatus === 'scheduled' ? 'orange' : (displayStatus === 'sent' ? 'green' : 'gray')}}>{displayStatusText}</span></span>
                          {notification.status === 'scheduled' && notification.scheduledAt && (
                              <span>Scheduled: {format(notification.scheduledAt, "MMM d, yyyy, h:mm a")} {isPastScheduled ? "(Now Active)" : ""}</span>
                          )}
                           {notification.status === 'sent' && notification.scheduledAt && (
                              <span>Originally Scheduled: {format(notification.scheduledAt, "MMM d, yyyy, h:mm a")}</span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground whitespace-pre-line mb-2" dangerouslySetInnerHTML={{ __html: formatWhatsAppTextToHtml(notification.content) }} />
                        {notification.imageUrl && (<a href={notification.imageUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline break-all">View Image</a>)}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-1 items-end sm:items-center shrink-0">
                         <Button variant="ghost" size="icon" className="text-primary hover:bg-primary/10" onClick={() => handleEditNotification(notification)} disabled={isSubmitting || isDeleting === notification.id }><Pencil className="h-4 w-4" /></Button>
                         <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" disabled={isDeleting === notification.id || isSubmitting }>{isDeleting === notification.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</Button></AlertDialogTrigger>
                          <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>Delete "{notification.title}"?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteNotification(notification.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    <Separator className="my-2"/>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <div className="flex items-center"><CalendarClock className="mr-1.5 h-3.5 w-3.5" /> Created: {format(notification.createdAt, "MMM d, yyyy, h:mm a")} by {notification.authorName || 'Admin'}</div>
                      <span className="italic">Read by: {notification.readByUserIds?.length || 0} user(s)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

