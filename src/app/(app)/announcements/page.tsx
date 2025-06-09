
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
import { siteConfig, notificationCategories } from "@/config/site"; // Updated import
import { Button } from "@/components/ui/button";

const READ_NOTIFICATIONS_STORAGE_KEY_PREFIX = "ashara_mubaraka_read_notifications_";

async function fetchFirestoreAnnouncements(): Promise<Omit<Announcement, 'status'>[]> {
  const notificationsCollectionRef = collection(db, "notifications");
  const q = query(notificationsCollectionRef, orderBy("createdAt", "desc"));

  try {
    const querySnapshot = await getDocs(q);
    const announcementsData = querySnapshot.docs.map((doc) => {
      const data = doc.data() as DocumentData;
      return {
        id: doc.id,
        title: data.title || "No Title",
        content: data.content || "No Content",
        date: (data.createdAt as Timestamp)?.toDate() || new Date(),
        author: data.authorName || "Unknown Author",
        imageUrl: data.imageUrl,
        imageHint: data.title ? data.title.split(" ").slice(0,2).join(" ") : "notification image",
        category: data.category || "General",
        readByUserIds: (data.readByUserIds as string[] | undefined) || [],
      };
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

  const determineStatus = useCallback((ann: Omit<Announcement, 'status'>): Announcement['status'] => {
    if (authUser && ann.readByUserIds?.includes(authUser.username)) {
      return 'read';
    }
    if (localStorageReadIds.has(ann.id)) {
        return 'read';
    }
    return 'unread';
  }, [authUser, localStorageReadIds]);

  const loadAnnouncements = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const baseData = await fetchFirestoreAnnouncements();
      const dataWithStatus: Announcement[] = baseData.map(ann => ({
        ...ann,
        status: determineStatus(ann),
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

    // Optimistically update UI
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
        description: "Failed to mark notification as read on server. Your local view is updated.",
      });
      // Potentially revert optimistic update if server fails, or just notify user
    }
  };

  const handleMarkAllRead = async () => {
    if (!authUser?.username) return;
    setIsMarkingAllRead(true);

    const result = await markAllNotificationsAsReadForUserAction(authUser.username);

    if (result.success) {
      toast({
        title: "Success",
        description: result.message,
      });

      // Update local storage
      setLocalStorageReadIds(prevIds => {
        const newIds = new Set(prevIds);
        announcements.forEach(ann => newIds.add(ann.id));
        if (READ_NOTIFICATIONS_STORAGE_KEY) {
          try {
            localStorage.setItem(READ_NOTIFICATIONS_STORAGE_KEY, JSON.stringify(Array.from(newIds)));
          } catch (error) {
            console.error("Error saving all read notifications to localStorage:", error);
          }
        }
        return newIds;
      });

      // Update local announcements state
      setAnnouncements(prevAnns =>
        prevAnns.map(ann => ({
          ...ann,
          status: 'read',
          readByUserIds: Array.from(new Set([...(ann.readByUserIds || []), authUser.username]))
        }))
      );
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: result.message || "Failed to mark all notifications as read.",
      });
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
      } else {
        const statusOrder = { new: 0, unread: 1, read: 2 };
        if (a.status !== b.status) {
             return statusOrder[a.status] - statusOrder[b.status];
        }
        return b.date.getTime() - a.date.getTime();
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
             {searchTerm || selectedCategory !== "All" ? "No notifications match your search/filter criteria." : "There are no notifications at this time. Please check back later."}
           </AlertDescription>
         </Alert>
      )}
    </div>
  );
}
