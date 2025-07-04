
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
import { Youtube, PlayCircle, AlertCircle, ListVideo, PlusCircle, Trash2, CalendarDays, Loader2, Users, Pencil, XCircle, Ban, Info } from "lucide-react";
import { saveRelayAction, deleteRelayAction, fetchRelays, type LiveRelay, type RelayFormValues } from "@/actions/relayActions";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { useAdminMode } from "@/contexts/AdminModeContext";
import dynamic from 'next/dynamic'; 
import { db } from "@/lib/firebase";
import { doc, setDoc, deleteDoc, collection, onSnapshot, serverTimestamp, Unsubscribe } from "firebase/firestore";
import { siteConfig } from "@/config/site";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useRouter } from "next/navigation";
// AdPlaceholder import removed

const PlyrPlayer = dynamic(() => import('@/components/live-relay/PlyrPlayer'), {
  loading: () => <Skeleton className="aspect-video w-full bg-muted" />, 
  ssr: false 
});


const formSchema = z.object({
  name: z.string().min(2, "Miqaat name must be at least 2 characters.").max(100),
  startDate: z.string().refine(val => !isNaN(Date.parse(val)), { message: "Start date is required." }),
  endDate: z.string().refine(val => !isNaN(Date.parse(val)), { message: "End date is required." }),
  sourceType: z.enum(["youtube", "iframe"], { required_error: "Source type is required."}),
  youtubeId: z.string().optional(),
  iframeCode: z.string().optional(),
  adminUsername: z.string().min(1)
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

const defaultFormValues = (adminUsername: string) => ({
  name: "",
  startDate: format(new Date(), "yyyy-MM-dd"),
  endDate: format(new Date(), "yyyy-MM-dd"),
  sourceType: "youtube" as "youtube" | "iframe",
  youtubeId: "",
  iframeCode: "",
  adminUsername: adminUsername,
});

function AdminLiveRelayManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingRelays, setIsLoadingRelays] = useState(true);
  const [relays, setRelays] = useState<LiveRelay[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewerCounts, setViewerCounts] = useState<{ [key: string]: number | null }>({});
  const [editingRelayId, setEditingRelayId] = useState<string | null>(null);

  const form = useForm<RelayFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultFormValues(user?.username || ""),
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

  useEffect(() => { loadRelays(); }, [loadRelays]);

  useEffect(() => {
    if (!user?.username) form.reset(defaultFormValues(""));
    else form.reset(defaultFormValues(user.username));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.username]);


  useEffect(() => {
    if (!relays.length) return;
    const unsubscribers: Unsubscribe[] = [];
    setViewerCounts(prev => {
        const newCounts = {...prev};
        relays.forEach(r => { if (newCounts[r.id] === undefined) newCounts[r.id] = null; });
        return newCounts;
    });
    relays.forEach(relay => {
      const viewersColRef = collection(db, "live_relays", relay.id, "active_viewers");
      const unsubscribe = onSnapshot(viewersColRef, (snapshot) => {
        setViewerCounts(prevCounts => ({ ...prevCounts, [relay.id]: snapshot.size }));
      }, (error) => {
        console.error(`Error fetching viewer count for relay ${relay.id}:`, error);
        setViewerCounts(prevCounts => ({ ...prevCounts, [relay.id]: 0 }));
      });
      unsubscribers.push(unsubscribe);
    });
    return () => { unsubscribers.forEach(unsub => unsub()); };
  }, [relays]);

  const handleEditRelay = (relay: LiveRelay) => {
    setEditingRelayId(relay.id);
    form.reset({
      name: relay.name,
      startDate: format(relay.startDate, "yyyy-MM-dd"),
      endDate: format(relay.endDate, "yyyy-MM-dd"),
      sourceType: relay.sourceType,
      youtubeId: relay.youtubeId || "",
      iframeCode: relay.iframeCode || "",
      adminUsername: user?.username || relay.adminUsername,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingRelayId(null);
    form.reset(defaultFormValues(user?.username || ""));
  };

  async function onSubmit(values: RelayFormValues) {
    if (!user?.username) {
      toast({ variant: "destructive", title: "Error", description: "User not authenticated." });
      return;
    }
    setIsSubmitting(true);
    const submissionValues = { ...values, adminUsername: user.username };
    const result = await saveRelayAction(submissionValues, editingRelayId || undefined);

    if (result.success) {
      toast({ title: "Success", description: result.message });
      handleCancelEdit(); 
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
      setViewerCounts(prevCounts => { const newCounts = {...prevCounts}; delete newCounts[relayId]; return newCounts; });
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
            <PlusCircle className="mr-3 h-7 w-7 text-primary" /> {editingRelayId ? "Edit Live Relay Miqaat" : "Add Live Relay Miqaat"}
          </CardTitle>
          <CardDescription>{editingRelayId ? "Modify the details of the existing Miqaat." : "Create new live relay events (Miqaats)."}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Miqaat Name</FormLabel><FormControl><Input placeholder="e.g., Ashara Mubaraka 1446H" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <div className="grid md:grid-cols-2 gap-4">
                <FormField control={form.control} name="startDate" render={({ field }) => (<FormItem><FormLabel>Start Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="endDate" render={({ field }) => (<FormItem><FormLabel>End Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <FormField control={form.control} name="sourceType" render={({ field }) => (<FormItem><FormLabel>Source Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select source type" /></SelectTrigger></FormControl><SelectContent><SelectItem value="youtube">YouTube (Plyr.io)</SelectItem><SelectItem value="iframe">Full iFrame Code</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
              {sourceType === "youtube" && (<FormField control={form.control} name="youtubeId" render={({ field }) => (<FormItem><FormLabel>YouTube Video ID</FormLabel><FormControl><Input placeholder="e.g., dQw4w9WgXcQ" {...field} /></FormControl><FormMessage /><FormDescription className="text-xs">Enter the YouTube Video ID. Plyr.io player will be used.</FormDescription></FormItem>)} />)}
              {sourceType === "iframe" && (<FormField control={form.control} name="iframeCode" render={({ field }) => (<FormItem><FormLabel>Full iFrame Code</FormLabel><FormControl><Textarea placeholder='<iframe src="…" …></iframe>' className="min-h-[100px]" {...field} /></FormControl><FormMessage /></FormItem>)} />)}
              <div className="flex gap-2">
                <Button type="submit" className="flex-grow" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingRelayId ? (isSubmitting ? "Updating..." : "Update Miqaat") : (isSubmitting ? "Saving..." : "Save Miqaat")}
                </Button>
                {editingRelayId && (
                  <Button type="button" variant="outline" onClick={handleCancelEdit} disabled={isSubmitting}>
                    <XCircle className="mr-2 h-4 w-4" /> Cancel Edit
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader><CardTitle className="text-xl font-bold flex items-center"><ListVideo className="mr-3 h-6 w-6 text-primary" /> Existing Miqaats</CardTitle></CardHeader>
        <CardContent>
          {isLoadingRelays ? (<div className="space-y-4">{[1,2].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>)
           : relays.length === 0 ? (<p className="text-muted-foreground">No Miqaats added yet.</p>)
           : (<ul className="space-y-4">
              {relays.map(relay => (
                <li key={relay.id} className="p-4 border rounded-md flex flex-col sm:flex-row justify-between sm:items-start gap-2 shadow-sm">
                  <div className="flex-grow space-y-1">
                    <p className="font-semibold">{relay.name}</p>
                    <p className="text-sm text-muted-foreground">{format(relay.startDate, "MMM d, yyyy")} - {format(relay.endDate, "MMM d, yyyy")}</p>
                    <p className="text-xs text-muted-foreground">Type: {relay.sourceType}</p>
                    <p className="text-xs text-muted-foreground flex items-center"><Users className="mr-1 h-3 w-3" />Live Viewers: {viewerCounts[relay.id] === null ? <Loader2 className="h-3 w-3 animate-spin inline-block ml-1" /> : (viewerCounts[relay.id] ?? 0).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-1 mt-2 sm:mt-0 shrink-0">
                    <Button variant="ghost" size="icon" className="text-primary hover:bg-primary/10" onClick={() => handleEditRelay(relay)} disabled={isSubmitting || deletingId === relay.id}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" disabled={deletingId === relay.id || isSubmitting}><Trash2 className="h-4 w-4" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will delete "{relay.name}".</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(relay.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                    </AlertDialog>
                  </div>
                </li>
              ))}
            </ul>)}
        </CardContent>
      </Card>
      {/* AdPlaceholder component removed from here for Admin view */}
    </div>
  );
}

function UserLiveRelayViewer() {
  const { user: authUser } = useAuth();
  const [currentRelay, setCurrentRelay] = useState<LiveRelay | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveViewerCount, setLiveViewerCount] = useState<number | null>(null);

  const now = new Date(); 
  const isEventActive = currentRelay ? isWithinInterval(now, { start: currentRelay.startDate, end: new Date(currentRelay.endDate.getTime() + (24*60*60*1000 -1)) }) : false;

  useEffect(() => {
    async function loadAndSetRelay() {
      setIsLoading(true); setError(null);
      try {
        const fetchedRelays = await fetchRelays();
        if (fetchedRelays.length === 0) { setCurrentRelay(null); setIsLoading(false); return; }
        const todayStartOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const activeRelays = fetchedRelays.filter(relay => isWithinInterval(now, { start: relay.startDate, end: new Date(relay.endDate.getTime() + (24*60*60*1000 -1)) }));
        let relayToDisplay: LiveRelay | null = null;
        if (activeRelays.length > 0) {
          relayToDisplay = activeRelays.sort((a, b) => compareAsc(b.createdAt, a.createdAt))[0];
        } else {
          const upcomingRelays = fetchedRelays.filter(r => compareAsc(r.startDate, todayStartOfDay) >= 0 && !isPast(r.endDate)).sort((a,b) => compareAsc(a.startDate, b.startDate));
          if (upcomingRelays.length > 0) relayToDisplay = upcomingRelays[0];
        }
        setCurrentRelay(relayToDisplay);
      } catch (err) { setError("Failed to load live relay. Try again later."); console.error("Error fetching relays:", err);
      } finally { setIsLoading(false); }
    }
    loadAndSetRelay();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  useEffect(() => {
    let unsubPresence: Unsubscribe | undefined;
    if (currentRelay && isEventActive && authUser?.username) {
      const userViewerRef = doc(db, "live_relays", currentRelay.id, "active_viewers", authUser.username);
      setDoc(userViewerRef, { joinedAt: serverTimestamp(), name: authUser.name || authUser.username })
        .catch(err => console.error("Error marking user active:", err));
      unsubPresence = () => {
        if (currentRelay?.id && authUser?.username) { 
            deleteDoc(doc(db, "live_relays", currentRelay.id, "active_viewers", authUser.username))
                .catch(err => console.error("Error removing user active status:", err));
        }
      };
    }
    return () => { if (unsubPresence) unsubPresence(); };
  }, [currentRelay, isEventActive, authUser]);

  useEffect(() => {
    let unsubCount: Unsubscribe | undefined;
    if (currentRelay) {
      setLiveViewerCount(null); 
      const viewersColRef = collection(db, "live_relays", currentRelay.id, "active_viewers");
      unsubCount = onSnapshot(viewersColRef, (snapshot) => { setLiveViewerCount(snapshot.size);
      }, (err) => { console.error("Error fetching viewer count:", err); setLiveViewerCount(0); });
    } else { setLiveViewerCount(0); }
    return () => { if (unsubCount) unsubCount(); };
  }, [currentRelay]);

  if (isLoading) return <div className="space-y-6 animate-fadeIn"><Skeleton className="h-12 w-3/4" /><Skeleton className="aspect-video w-full" /> {/* AdPlaceholder component removed from here for loading state */}</div>;
  if (error) return <><Alert variant="destructive" className="shadow-md animate-fadeIn"><AlertCircle className="h-5 w-5" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> {/* AdPlaceholder component removed from here for error state */}</>;
  if (!currentRelay) return <><Alert variant="default" className="shadow-md animate-fadeIn"><Youtube className="h-5 w-5" /><AlertTitle>No Live Relay</AlertTitle><AlertDescription>No active or upcoming relays. Check back later.</AlertDescription></Alert> {/* AdPlaceholder component removed from here for no relay state */}</>;

  const isEventUpcoming = !isEventActive && compareAsc(currentRelay.startDate, now) > 0;
  const eventHasEnded = !isEventActive && !isEventUpcoming && isPast(currentRelay.endDate);

  return (
    <div className="space-y-6 animate-fadeIn">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl font-bold tracking-tight flex items-center"><PlayCircle className="mr-3 h-7 w-7 md:h-8 md:w-8 text-primary" /> {currentRelay.name}</CardTitle>
          <CardDescription className="space-y-1.5 text-sm">
            <div className="flex items-center gap-2 flex-wrap">
                <CalendarDays className="h-4 w-4 text-muted-foreground"/>
                <span className="text-muted-foreground">{format(currentRelay.startDate, "EEE, MMM d, yyyy")} to {format(currentRelay.endDate, "EEE, MMM d, yyyy")}</span>
                {isEventUpcoming && <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">Upcoming</span>}
                {isEventActive && <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">Live Now</span>}
                {eventHasEnded && <span className="px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded-full">Ended</span>}
            </div>
            {isEventActive && (<div className="flex items-center text-muted-foreground"><Users className="mr-1.5 h-4 w-4" /><span>Live Viewers: {liveViewerCount === null ? <Loader2 className="h-3 w-3 animate-spin inline-block ml-1" /> : (liveViewerCount ?? 0).toLocaleString()}</span></div>)}
          </CardDescription>
        </CardHeader>
        {isEventUpcoming && (<CardContent><Alert><Youtube className="h-5 w-5" /><AlertTitle>Miqaat Upcoming</AlertTitle><AlertDescription>"{currentRelay.name}" will start {format(currentRelay.startDate, "MMM d, yyyy 'at' h:mm a")}.</AlertDescription></Alert></CardContent>)}
        
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
        {eventHasEnded && (<CardContent><Alert><Youtube className="h-5 w-5" /><AlertTitle>Miqaat Ended</AlertTitle><AlertDescription>"{currentRelay.name}" has concluded.</AlertDescription></Alert></CardContent>)}
      
      </Card>
      {/* AdPlaceholder component removed from here for User view */}
    </div>
  );
}

export default function LiveRelayPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { isAdminMode } = useAdminMode();
  const { settings: appSettings, isLoading: settingsLoading } = useAppSettings();
  const router = useRouter();

  useEffect(() => { document.title = `Live Relay | ${siteConfig.name}`; }, []);

  useEffect(() => {
    if (!settingsLoading && appSettings && typeof appSettings.showLiveRelayPage === 'boolean' && !appSettings.showLiveRelayPage) {
      router.replace('/dashboard');
    }
  }, [appSettings, settingsLoading, router]);

  if (authLoading || settingsLoading) {
    return <div className="flex flex-1 items-center justify-center p-4"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }
  
  if (appSettings && typeof appSettings.showLiveRelayPage === 'boolean' && !appSettings.showLiveRelayPage) {
    // This state might be briefly visible before redirect or if redirect fails.
    return (
        <div className="flex flex-1 flex-col items-center justify-center p-4">
            <Card className="shadow-lg p-8 animate-fadeIn w-full max-w-md text-center">
                <CardHeader>
                    <CardTitle className="flex items-center justify-center"><Ban className="mr-2 h-7 w-7 text-destructive" /> Page Not Available</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">The Live Relay page is currently not available.</p>
                    <Button onClick={() => router.push('/dashboard')} className="mt-4">Go to Dashboard</Button>
                </CardContent>
            </Card>
        </div>
    );
  }

  const PageComponentToRender = user?.isAdmin && isAdminMode ? AdminLiveRelayManager : UserLiveRelayViewer;

  return <PageComponentToRender />;
}

