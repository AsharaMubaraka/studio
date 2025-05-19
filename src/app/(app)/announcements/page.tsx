
"use client";

import type { Metadata } from "next";
import { AnnouncementItem, type Announcement } from "@/components/announcements/AnnouncementItem";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Megaphone } from "lucide-react";

// export const metadata: Metadata = { // Cannot be used in client component
//   title: "Announcements",
// };


// Mock data simulating Firestore fetch
const mockAnnouncements: Announcement[] = [
  {
    id: "1",
    title: "Community Meeting Next Week",
    content: "Join us for our monthly community meeting on Tuesday at 7 PM in the main hall. We'll be discussing upcoming events and new initiatives.\n\nAgenda:\n- Review of last month's minutes\n- Budget update\n- Planning for the summer festival\n- Open Q&A session",
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    author: "Admin Team",
    // tags: ["meeting", "community", "event"], // Removed tags
    imageUrl: "https://placehold.co/600x400.png",
    imageHint: "meeting community"
  },
  {
    id: "2",
    title: "Volunteer Drive for Charity Event",
    content: "We are looking for volunteers for our upcoming charity bake sale. All proceeds will go to local shelters. Sign up sheet is available at the front desk.\n\nRoles needed:\n- Bakers\n- Sales assistants\n- Setup and cleanup crew",
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    author: "Events Committee",
    // tags: ["volunteer", "charity", "bake sale"], // Removed tags
    imageUrl: "https://placehold.co/600x400.png",
    imageHint: "volunteer charity"
  },
  {
    id: "3",
    title: "New Website Launch!",
    content: "We're excited to announce the launch of our new community website! Explore new features and resources. Your feedback is welcome.",
    date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
    author: "Tech Team",
    // tags: ["website", "update", "launch"], // Removed tags
  },
];

async function fetchAnnouncements(): Promise<Announcement[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  return mockAnnouncements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}


export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  useEffect(() => {
    document.title = "Announcements | Anjuman Hub";
    async function loadAnnouncements() {
      setIsLoading(true);
      const data = await fetchAnnouncements();
      setAnnouncements(data);
      setIsLoading(false);
    }
    loadAnnouncements();
  }, []);

  const filteredAndSortedAnnouncements = announcements
    .filter(ann => ann.title.toLowerCase().includes(searchTerm.toLowerCase()) || ann.content.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortOrder === "newest") {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } else {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
    });

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 p-4 bg-card rounded-lg shadow">
        <h1 className="text-3xl font-bold tracking-tight">Announcements</h1>
        <div className="flex gap-4 w-full md:w-auto">
          <Input
            placeholder="Search announcements..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs"
          />
          <Select value={sortOrder} onValueChange={(value: "newest" | "oldest") => setSortOrder(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
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
              <Skeleton className="h-48 w-full" />
              <CardHeader>
                <Skeleton className="h-8 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-8 w-24" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : filteredAndSortedAnnouncements.length > 0 ? (
        <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-2">
          {filteredAndSortedAnnouncements.map((announcement) => (
            <AnnouncementItem key={announcement.id} announcement={announcement} />
          ))}
        </div>
      ) : (
         <Alert className="shadow-md animate-fadeIn">
           <Megaphone className="h-5 w-5" />
           <AlertTitle>No Announcements Found</AlertTitle>
           <AlertDescription>
             {searchTerm ? "No announcements match your search criteria. Try a different search term." : "There are no announcements at this time. Please check back later."}
           </AlertDescription>
         </Alert>
      )}
    </div>
  );
}
