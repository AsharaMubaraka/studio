
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge"; // Removed Badge
import { format } from "date-fns";
import Image from "next/image";
import { CalendarDays } from "lucide-react"; // Removed Tag

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string; // ISO string
  author: string;
  tags?: string[]; // Tags are optional in the interface
  imageUrl?: string;
  imageHint?: string;
}

interface AnnouncementItemProps {
  announcement: Announcement;
}

export function AnnouncementItem({ announcement }: AnnouncementItemProps) {
  return (
    <Card className="flex flex-col overflow-hidden shadow-lg transition-all hover:shadow-xl animate-fadeIn">
      {announcement.imageUrl && (
        <div className="relative h-48 w-full">
          <Image
            src={announcement.imageUrl}
            alt={announcement.title}
            layout="fill"
            objectFit="cover"
            data-ai-hint={announcement.imageHint || "announcement relevant"}
          />
        </div>
      )}
      <CardHeader>
        <CardTitle className="text-2xl">{announcement.title}</CardTitle>
        <CardDescription className="flex items-center text-sm text-muted-foreground">
          <CalendarDays className="mr-2 h-4 w-4" />
          Posted on {format(new Date(announcement.date), "MMMM d, yyyy")} by {announcement.author}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="whitespace-pre-line leading-relaxed">{announcement.content}</p>
      </CardContent>
      {/* Removed CardFooter with tags */}
    </Card>
  );
}
