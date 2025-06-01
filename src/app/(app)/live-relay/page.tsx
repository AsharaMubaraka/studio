
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { format, parseISO, isWithinInterval, compareAsc, isPast } from "date-fns";
import { Youtube, PlayCircle, AlertCircle, ListVideo, PlusCircle, Trash2, CalendarDays, Loader2, HelpCircle, Users } from "lucide-react";
import { saveRelayAction, deleteRelayAction, fetchRelays, type LiveRelay, type RelayFormValues } from "@/actions/relayActions";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useAdminMode } from "@/contexts/AdminModeContext";
import PlyrPlayer from '@/components/live-relay/PlyrPlayer';
import { db } from "@/lib/firebase";
import { doc, setDoc, deleteDoc, collection, onSnapshot, serverTimestamp, query as firestoreQuery, where, getDocs } from "firebase/firestore";

const formSchema = z.object({
  name: z.string().min(2, "Miqaat name must be at least 2 characters.").max(100),
  startDate: z.string().refine(val => !isNaN(Date.parse(val)), { message: "Start date is required." }),
  endDate: z.string().refine(val => !isNaN(Date.parse(val)), { message: "End date is required." }),
  sourceType: z.enum(["youtube", "iframe"], { required_error: "Source type is required."}),
  youtubeId: z.string().optional(),
  iframeCode: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.sourceType === "youtube" && (!data.youtubeId || data.youtubeId.trim() === "")) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["youtubeId"], message: "YouTube Video ID is required for YouTube source type." });
  }
  if (data.sourceType === "iframe" && (!data.iframeCode || data.iframeCode.trim() === "")) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["iframeCode"], message: "iFrame code is required." });
  }
  if (data.startDate && data.endDate && new Date(data.startDate) > new Date(data.endDate)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endDate"], message: "End date cannot be before start date." });
  }
});

function AdminLiveRelayManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingRelays, setIsLoadingRelays] = useState(true);
  const [relays, setRelays] = useState<LiveRelay[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const form = useForm<RelayFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      startDate: format(new Date(), "yyyy-MM-dd"),
      endDate: format(new Date(), "yyyy-MM-dd"),
      sourceType: "youtube",
      youtubeId: "",
      iframeCode: "",
      adminUsername: user?.username || "",
    },
  });

  const sourceType = form.watch("sourceType");

  const loadRelays = useCallback(async () => {
    setIsLoadingRelays(true);
    try {
      const fetchedRelays = await fetchRelays();
      setRelays(fetchedRelays);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Could not fetch existing relays." });
    } finally {
      setIsLoadingRelays(false);
    }
  }, [toast]);

  useEffect(() => {
    loadRelays();
  }, [loadRelays]);

  async function onSubmit(values: RelayFormValues) {
    if (!user?.username) {
      toast({ variant: "destructive", title: "Error", description: "User not authenticated." });
      return;
    }
    setIsSubmitting(true);
    const result = await saveRelayAction({ ...values, adminUsername: user.username });
    if (result.success) {
      toast({ title: "Success", description: result.message });
      form.reset({
        name: "",
        startDate: format(new Date(), "yyyy-MM-dd"),
        endDate: format(new Date(), "yyyy-MM-dd"),
        sourceType: "youtube",
        youtubeId: "",
        iframeCode: "",
        adminUsername: user.username,
      });
      loadRelays();
    } else {
      toast({ variant: "destructive", title: "Error", description: result.message || "Failed to save relay." });
    }
    setIsSubmitting(false);
  }

  async function handleDelete(relayId: string) {
    setDeletingId(relayId);
    const result = await deleteRelayAction(relayId);
    if (result.success) {
      toast({ title: "Success", description: result.message });
      setRelays(prev => prev.filter(r => r.id !== relayId));
    } else {
      toast({ variant: "destructive", title: "Error", description: result.message || "Failed to delete relay." });
    }
    setDeletingId(null);
  }

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center">
            <PlusCircle className="mr-3 h-7 w-7 text-primary" /> Add/Manage Live Relay Miqaat
          </CardTitle>
          <CardDescription>Create or update live relay events (Miqaats).</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Miqaat Name</FormLabel>
                  <FormControl><Input placeholder="e.g., Ashara Mubaraka 1446H" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid md:grid-cols-2 gap-4">
                <FormField control={form.control} name="startDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="endDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="sourceType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Source Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select source type" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="youtube">YouTube (via Plyr.io)</SelectItem>
                      <SelectItem value="iframe">Full iFrame Code</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              {sourceType === "youtube" && (
                <FormField control={form.control} name="youtubeId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>YouTube Video ID</FormLabel>
                    <FormControl><Input placeholder="e.g., dQw4w9WgXcQ" {...field} /></FormControl>
                    <FormMessage />
                    <FormDescription className="text-xs">
                      Enter the standard YouTube Video ID. Plyr.io player will be used for playback.
                    </FormDescription>
                  </FormItem>
                )} />
              )}
              {sourceType === "iframe" && (
                <FormField control={form.control} name="iframeCode" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full iFrame Code</FormLabel>
                    <FormControl><Textarea placeholder='<iframe src="..." width="560" height="315" ...></iframe>' className="min-h-[100px]" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Miqaat
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center">
            <ListVideo className="mr-3 h-6 w-6 text-primary" /> Existing Miqaats
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingRelays ? (
            <div className="space-y-4">
              {[1,2].map(i => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : relays.length === 0 ? (
            <p className="text-muted-foreground">No Miqaats have been added yet.</p>
          ) : (
            <ul className="space-y-4">
              {relays.map(relay => (
                <li key={relay.id} className="p-4 border rounded-md flex justify-between items-center shadow-sm">
                  <div>
                    <p className="font-semibold">{relay.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(relay.startDate, "MMM d, yyyy")} - {format(relay.endDate, "MMM d, yyyy")}
                    </p>
                    <p className="text-xs text-muted-foreground">Type: {relay.sourceType}</p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" disabled={deletingId === relay.id}>
                         {deletingId === relay.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the Miqaat: "{relay.name}".
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(relay.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function UserLiveRelayViewer() {
  const { user: authUser } = useAuth();
  const [currentRelay, setCurrentRelay] = useState<LiveRelay | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inAppViewerCount, setInAppViewerCount] = useState<number | null>(null);

  const now = new Date(); 
  const isEventActive = currentRelay ? isWithinInterval(now, { start: currentRelay.startDate, end: new Date(currentRelay.endDate.getTime() + (24*60*60*1000 -1)) }) : false;

  useEffect(() => {
    async function loadAndSetRelay() {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedRelays = await fetchRelays();
        if (fetchedRelays.length === 0) {
          setCurrentRelay(null);
          setIsLoading(false);
          return;
        }

        const todayStartOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const activeRelays = fetchedRelays.filter(relay =>
          isWithinInterval(now, { start: relay.startDate, end: new Date(relay.endDate.getTime() + (24*60*60*1000 -1)) })
        );

        let relayToDisplay: LiveRelay | null = null;

        if (activeRelays.length > 0) {
          relayToDisplay = activeRelays.sort((a, b) => compareAsc(b.createdAt, a.createdAt))[0];
        } else {
          const upcomingRelays = fetchedRelays
            .filter(relay => compareAsc(relay.startDate, todayStartOfDay) >= 0 && !isPast(relay.endDate))
            .sort((a, b) => compareAsc(a.startDate, b.startDate));

          if (upcomingRelays.length > 0) {
            relayToDisplay = upcomingRelays[0];
          }
        }
        setCurrentRelay(relayToDisplay);

      } catch (err) {
        setError("Failed to load live relay information. Please try again later.");
        console.error("Error fetching relays for user view:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadAndSetRelay();
  }, []); // Removed `now` from dependencies to avoid re-fetching relays constantly. `now` is now defined outside.

  // Effect for managing user presence in active_viewers
  useEffect(() => {
    if (currentRelay && isEventActive && authUser?.username) {
      const userViewerRef = doc(db, "live_relays", currentRelay.id, "active_viewers", authUser.username);
      setDoc(userViewerRef, { 
        joinedAt: serverTimestamp(), 
        name: authUser.name || authUser.username 
      })
        .then(() => console.log(`User ${authUser.username} marked as active for relay ${currentRelay.id}`))
        .catch(err => console.error("Error marking user active:", err));

      return () => {
        // Check currentRelay.id on cleanup because currentRelay might have changed or become null
        // This explicit check ensures we are deleting from the correct path.
        if (currentRelay?.id && authUser?.username) {
            const relayIdForCleanup = currentRelay.id; // Capture id before potential change
            const usernameForCleanup = authUser.username;
            deleteDoc(doc(db, "live_relays", relayIdForCleanup, "active_viewers", usernameForCleanup))
                .then(() => console.log(`User ${usernameForCleanup} removed as active from relay ${relayIdForCleanup}`))
                .catch(err => console.error("Error removing user active status:", err));
        }
      };
    }
  }, [currentRelay, isEventActive, authUser]);

  // Effect for listening to viewer count
  useEffect(() => {
    if (currentRelay) {
      setInAppViewerCount(null); // Indicate loading
      const viewersColRef = collection(db, "live_relays", currentRelay.id, "active_viewers");
      const unsubscribe = onSnapshot(viewersColRef, (snapshot) => {
        setInAppViewerCount(snapshot.size);
      }, (err) => {
        console.error("Error fetching viewer count:", err);
        setInAppViewerCount(0); // Default to 0 on error
      });

      return () => unsubscribe();
    } else {
      setInAppViewerCount(0);
    }
  }, [currentRelay]);


  if (isLoading) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="aspect-video w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="shadow-md animate-fadeIn">
        <AlertCircle className="h-5 w-5" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!currentRelay) {
    return (
      <Alert variant="default" className="shadow-md animate-fadeIn">
        <Youtube className="h-5 w-5" />
        <AlertTitle>No Live Relay Available</AlertTitle>
        <AlertDescription>
          There are no active or upcoming live relays scheduled at this time. Please check back later.
        </AlertDescription>
      </Alert>
    );
  }

  const isEventUpcoming = !isEventActive && compareAsc(currentRelay.startDate, now) > 0;
  const eventHasEnded = !isEventActive && !isEventUpcoming && isPast(currentRelay.endDate);

  return (
    <div className="space-y-6 animate-fadeIn">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl font-bold tracking-tight flex items-center">
            <PlayCircle className="mr-3 h-7 w-7 md:h-8 md:w-8 text-primary" /> {currentRelay.name}
          </CardTitle>
          <CardDescription className="space-y-1.5 text-sm">
            <div className="flex items-center gap-2 flex-wrap">
                <CalendarDays className="h-4 w-4 text-muted-foreground"/>
                <span className="text-muted-foreground">
                {format(currentRelay.startDate, "EEE, MMM d, yyyy")} to {format(currentRelay.endDate, "EEE, MMM d, yyyy")}
                </span>
                {isEventUpcoming && <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">Upcoming</span>}
                {isEventActive && <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">Live Now</span>}
                {eventHasEnded && <span className="px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded-full">Ended</span>}
            </div>
            {isEventActive && (
                <div className="flex items-center text-muted-foreground">
                    <Users className="mr-1.5 h-4 w-4" />
                    <span>
                        App Viewers: {inAppViewerCount === null ? <Loader2 className="h-3 w-3 animate-spin inline-block ml-1" /> : (inAppViewerCount ?? 0).toLocaleString()}
                    </span>
                </div>
            )}
          </CardDescription>
        </CardHeader>
        {isEventUpcoming && (
           <CardContent>
             <Alert>
                <Youtube className="h-5 w-5" />
                <AlertTitle>This Miqaat is Upcoming</AlertTitle>
                <AlertDescription>
                    The live relay for "{currentRelay.name}" will be available starting {format(currentRelay.startDate, "MMMM d, yyyy 'at' h:mm a")}.
                </AlertDescription>
             </Alert>
           </CardContent>
        )}
        {isEventActive && currentRelay.sourceType === "youtube" && currentRelay.youtubeId && (
          <CardContent className="p-0 aspect-video bg-black">
            <PlyrPlayer videoId={currentRelay.youtubeId} />
          </CardContent>
        )}
        {isEventActive && currentRelay.sourceType === "iframe" && currentRelay.iframeCode && (
          <CardContent className="p-0 aspect-video">
            <div className="h-full w-full [&>iframe]:w-full [&>iframe]:h-full" dangerouslySetInnerHTML={{ __html: currentRelay.iframeCode }} />
          </CardContent>
        )}
         {eventHasEnded && (
             <CardContent>
                <Alert>
                    <Youtube className="h-5 w-5" />
                    <AlertTitle>Miqaat Has Ended</AlertTitle>
                    <AlertDescription>
                        The live relay for "{currentRelay.name}" has concluded.
                    </AlertDescription>
                </Alert>
            </CardContent>
        )}
      </Card>
    </div>
  );
}


export default function LiveRelayPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { isAdminMode } = useAdminMode();

  useEffect(() => {
    document.title = "Live Relay | Anjuman Hub";
  }, []);

  if (authLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return user?.isAdmin && isAdminMode ? <AdminLiveRelayManager /> : <UserLiveRelayViewer />;
}

