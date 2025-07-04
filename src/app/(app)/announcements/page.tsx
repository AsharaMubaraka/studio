
"use client";

import { AnnouncementItem, type Announcement } from "@/components/announcements/AnnouncementItem";
import { useEffect, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Bell, CheckCheck, Loader2, Tag } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs, Timestamp, DocumentData } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { markNotificationAsReadAction, markAllNotificationsAsReadForUserAction } from "@/actions/notificationActions";
import { useToast } from "@/hooks/use-toast";
import { siteConfig, notificationCategories } from "@/config/site";
import { Button } from "@/components/ui/button";

const READ_NOTIFICATIONS_STORAGE_KEY_PREFIX = "ashara_mubaraka_read_notifications_";

async function fetchFirestoreAnnouncements(): Promise<Omit<Announcement, 'status'>[]> {
  const notificationsCollectionRef = collection(db, "notifications");
  const q = query(notificationsCollectionRef, orderBy("createdAt", "desc")); // Initial sort by creation
  const now = new Date(); // Capture 'now' once for consistent filtering/date setting

  try {
    const querySnapshot = await getDocs(q);
    const announcementsData = querySnapshot.docs.map((doc) => {
      const data = doc.data() as DocumentData;
      const createdAtOriginal = (data.createdAt as Timestamp)?.toDate() || new Date();
      const scheduledAtOriginal = (data.scheduledAt as Timestamp)?.toDate() || null;
      const internalStatusOriginal = data.status || 'sent';

      let effectiveDate = createdAtOriginal;
      if (internalStatusOriginal === 'scheduled' && scheduledAtOriginal && scheduledAtOriginal <= now) {
        effectiveDate = scheduledAtOriginal;
      } else if (internalStatusOriginal === 'sent' && scheduledAtOriginal && scheduledAtOriginal <= now) {
        // If it was 'sent' but also had a scheduledAt (e.g. edited from scheduled to sent),
        // use the later of scheduledAt or createdAt for displayDate.
        effectiveDate = scheduledAtOriginal > createdAtOriginal ? scheduledAtOriginal : createdAtOriginal;
      }

      return {
        id: doc.id,
        title: data.title || "No Title",
        content: data.content || "No Content",
        date: effectiveDate, // This is the effective date for display and sorting
        author: data.authorName || "Unknown Author",
        imageUrl: data.imageUrl,
        imageHint: data.title ? data.title.split(" ").slice(0,2).join(" ") : "notification image",
        category: data.category || "General",
        readByUserIds: (data.readByUserIds as string[] | undefined) || [],
        scheduledAt: scheduledAtOriginal, // Keep original for reference
        internalStatus: internalStatusOriginal,
      };
    })
    .filter(ann => { // Filter out drafts and *future*-scheduled items
        if (ann.internalStatus === 'sent') return true;
        // Only include 'scheduled' items if their scheduledAt time is now or in the past
        if (ann.internalStatus === 'scheduled' && ann.scheduledAt && ann.scheduledAt <= now) return true;
        return false;
    })
    .sort((a,b) => { // Sort by effective date (which is now in ann.date)
        return b.date.getTime() - a.date.getTime();
    });

    return announcementsData;
  } catch (error) {
    console.error("Error fetching notifications from Firestore:", error);
    return [];
  }
}

export default function AnnouncementsPage() {
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"status" | "newest" | "oldest">("status");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);

  const [localStorageReadIds, setLocalStorageReadIds] = useState<Set<string>>(new Set());
  const READ_NOTIFICATIONS_STORAGE_KEY = authUser ? `${READ_NOTIFICATIONS_STORAGE_KEY_PREFIX}${authUser.username}` : '';


  useEffect(() => {
    document.title = `Notifications | ${siteConfig.name}`;
    if (READ_NOTIFICATIONS_STORAGE_KEY) {
      try {
        const storedReadIds = localStorage.getItem(READ_NOTIFICATIONS_STORAGE_KEY);
        if (storedReadIds) {
          setLocalStorageReadIds(new Set(JSON.parse(storedReadIds)));
        }
      } catch (error) {
        console.error("Error loading read notifications from localStorage:", error);
      }
    }
  }, [READ_NOTIFICATIONS_STORAGE_KEY]);

  const determineStatus = useCallback((ann: Omit<Announcement, 'status'>, determinationTime: Date): Announcement['status'] => {
    if (authUser && ann.readByUserIds?.includes(authUser.username)) {
      return 'read';
    }
    if (localStorageReadIds.has(ann.id)) {
        return 'read';
    }
    // If it's a past scheduled item and not read, consider it 'unread'
    if (ann.internalStatus === 'scheduled' && ann.scheduledAt && ann.scheduledAt <= determinationTime) {
        return 'unread';
    }
    // For 'sent' items that are not read, they are also 'unread'.
    // 'new' status could be for very recent items, but 'unread' covers general case.
    return 'unread'; // Default to unread if not explicitly read
  }, [authUser, localStorageReadIds]);

  const loadAnnouncements = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    const nowForStatusDetermination = new Date();
    try {
      const baseData = await fetchFirestoreAnnouncements(); // Already filtered and sorted by effective date
      const dataWithStatus: Announcement[] = baseData.map(ann => ({
        ...ann,
        // 'ann.date' is already the correct effective display/sort date.
        // The 'status' field here is what drives AnnouncementItem's display.
        status: determineStatus(ann, nowForStatusDetermination),
      }));
      setAnnouncements(dataWithStatus);
    } catch (err) {
      setFetchError("Failed to load notifications. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  }, [determineStatus]);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);


  const handleMarkAsRead = async (id: string) => {
    if (!authUser?.username) return;

    setLocalStorageReadIds(prevIds => {
      const newIds = new Set(prevIds);
      newIds.add(id);
      if (READ_NOTIFICATIONS_STORAGE_KEY) {
        try {
          localStorage.setItem(READ_NOTIFICATIONS_STORAGE_KEY, JSON.stringify(Array.from(newIds)));
        } catch (error) {
          console.error("Error saving read notifications to localStorage:", error);
        }
      }
      return newIds;
    });
    setAnnouncements(prevAnns =>
      prevAnns.map(ann => ann.id === id ? { ...ann, status: 'read', readByUserIds: [...(ann.readByUserIds || []), authUser.username] } : ann)
    );

    const result = await markNotificationAsReadAction(id, authUser.username);
    if (!result.success) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to mark as read on server.",
      });
    }
  };

  const handleMarkAllRead = async () => {
    if (!authUser?.username) return;
    setIsMarkingAllRead(true);

    const result = await markAllNotificationsAsReadForUserAction(authUser.username);

    if (result.success) {
      toast({ title: "Success", description: result.message });
      setLocalStorageReadIds(prevIds => {
        const newIds = new Set(prevIds);
        announcements.forEach(ann => newIds.add(ann.id));
        if (READ_NOTIFICATIONS_STORAGE_KEY) {
          try {
            localStorage.setItem(READ_NOTIFICATIONS_STORAGE_KEY, JSON.stringify(Array.from(newIds)));
          } catch (error) {
            console.error("Error saving all read to localStorage:", error);
          }
        }
        return newIds;
      });
      setAnnouncements(prevAnns =>
        prevAnns.map(ann => ({
          ...ann,
          status: 'read',
          readByUserIds: Array.from(new Set([...(ann.readByUserIds || []), authUser.username]))
        }))
      );
    } else {
      toast({ variant: "destructive", title: "Error", description: result.message || "Failed to mark all as read." });
    }
    setIsMarkingAllRead(false);
  };

  const filteredAndSortedAnnouncements = announcements
    .filter(ann =>
      (ann.title.toLowerCase().includes(searchTerm.toLowerCase()) || ann.content.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (selectedCategory === "All" || ann.category === selectedCategory)
    )
    .sort((a, b) => {
      if (sortOrder === "newest") {
        return b.date.getTime() - a.date.getTime();
      } else if (sortOrder === "oldest") {
        return a.date.getTime() - b.date.getTime();
      } else { // status sort
        const statusOrder = { new: 0, unread: 1, read: 2 }; // 'scheduled' should not be a display status here
        if (a.status !== b.status) {
             // Ensure 'scheduled' status (if it ever leaks through) is handled safely or mapped
             const aStatusVal = statusOrder[a.status as keyof typeof statusOrder] ?? 1; // Default to unread if unknown
             const bStatusVal = statusOrder[b.status as keyof typeof statusOrder] ?? 1;
             return aStatusVal - bStatusVal;
        }
        return b.date.getTime() - a.date.getTime(); // Fallback to newest if status is same
      }
    });

  const allNotificationsRead = announcements.length > 0 && announcements.every(ann => ann.status === 'read');

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 p-4 bg-card rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full md:w-auto justify-center md:justify-end">
          <Input
            placeholder="Search notifications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs flex-grow sm:flex-grow-0 w-full sm:w-auto"
          />
          <Select value={selectedCategory} onValueChange={(value: string) => setSelectedCategory(value)}>
            <SelectTrigger className="w-full sm:w-[180px] flex-grow sm:flex-grow-0">
              <SelectValue placeholder="Filter by Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Categories</SelectItem>
              {notificationCategories.map(category => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortOrder} onValueChange={(value: "status" | "newest" | "oldest") => setSortOrder(value)}>
            <SelectTrigger className="w-full sm:w-[180px] flex-grow sm:flex-grow-0">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="status">By Status</SelectItem>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={handleMarkAllRead}
            disabled={isMarkingAllRead || announcements.length === 0 || allNotificationsRead}
            variant="outline"
            className="w-full sm:w-auto flex-grow sm:flex-grow-0"
          >
            {isMarkingAllRead ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCheck className="mr-2 h-4 w-4" />}
            Mark All Read
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="shadow-lg animate-fadeIn">
              <Skeleton className="aspect-video w-full mb-3" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </Card>
          ))}
        </div>
      ) : fetchError ? (
        <Alert variant="destructive" className="shadow-md animate-fadeIn">
           <Bell className="h-5 w-5" />
           <AlertTitle>Error</AlertTitle>
           <AlertDescription>{fetchError}</AlertDescription>
         </Alert>
      ) : filteredAndSortedAnnouncements.length > 0 ? (
        <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-2">
          {filteredAndSortedAnnouncements.map((announcement) => (
            <AnnouncementItem
              key={announcement.id}
              announcement={announcement}
              onCardClick={handleMarkAsRead}
            />
          ))}
        </div>
      ) : (
         <Alert className="shadow-md animate-fadeIn">
           <Bell className="h-5 w-5" />
           <AlertTitle>No Notifications Found</AlertTitle>
           <AlertDescription>
             {searchTerm || selectedCategory !== "All" ? "No notifications match your search/filter criteria." : "There are no notifications at this time."}
           </AlertDescription>
         </Alert>
      )}
    </div>
  );
}

    