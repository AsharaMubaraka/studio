
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import Image from "next/image";
import { CalendarDays, Sparkle, Dot, CheckCircle2 } from "lucide-react";

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string; // ISO string
  author: string;
  status: 'new' | 'unread' | 'read'; // Added status
  imageUrl?: string;
  imageHint?: string;
}

interface AnnouncementItemProps {
  announcement: Announcement;
}

function StatusIndicator({ status }: { status: Announcement['status'] }) {
  if (status === 'new') {
    return <Sparkle className="h-5 w-5 text-primary ml-2 shrink-0" aria-label="New announcement" />;
  }
  if (status === 'unread') {
    return <Dot className="h-8 w-8 text-accent ml-1 -mr-1 shrink-0" aria-label="Unread announcement" />;
  }
  if (status === 'read') {
    return <CheckCircle2 className="h-5 w-5 text-muted-foreground ml-2 shrink-0" aria-label="Read announcement" />;
  }
  return null;
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
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl">{announcement.title}</CardTitle>
          <StatusIndicator status={announcement.status} />
        </div>
        <CardDescription className="flex items-center text-sm text-muted-foreground pt-1">
          <CalendarDays className="mr-2 h-4 w-4" />
          Posted on {format(new Date(announcement.date), "MMMM d, yyyy")} by {announcement.author}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="whitespace-pre-line leading-relaxed">{announcement.content}</p>
      </CardContent>
    </Card>
  );
}
