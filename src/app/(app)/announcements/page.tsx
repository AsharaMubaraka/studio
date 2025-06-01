
"use client";

import { AnnouncementItem, type Announcement } from "@/components/announcements/AnnouncementItem";
import { useEffect, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Bell } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs, Timestamp, DocumentData } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { markNotificationAsReadAction } from "@/actions/notificationActions";
import { useToast } from "@/hooks/use-toast";
import { siteConfig } from "@/config/site";

const READ_NOTIFICATIONS_STORAGE_KEY_PREFIX = "ashara_mubaraka_read_notifications_"; // Updated prefix

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
  const [fetchError, setFetchError] = useState<string | null>(null);
  
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
    }
  };

  const filteredAndSortedAnnouncements = announcements
    .filter(ann => ann.title.toLowerCase().includes(searchTerm.toLowerCase()) || ann.content.toLowerCase().includes(searchTerm.toLowerCase()))
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

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 p-4 bg-card rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
        <div className="flex gap-4 w-full md:w-auto">
          <Input
            placeholder="Search notifications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs"
          />
          <Select value={sortOrder} onValueChange={(value: "status" | "newest" | "oldest") => setSortOrder(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="status">By Status</SelectItem>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
            </SelectContent>
          </Select>
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
             {searchTerm ? "No notifications match your search criteria. Try a different search term." : "There are no notifications at this time. Please check back later."}
           </AlertDescription>
         </Alert>
      )}
    </div>
  );
}
