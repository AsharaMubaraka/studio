
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import Image from "next/image";
import { CalendarDays, Sparkle, Mail, CheckCircle2 } from "lucide-react";

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: Date; // Changed from ISO string to Date object
  author: string;
  status: 'new' | 'unread' | 'read';
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
    return <Mail className="h-5 w-5 text-accent ml-2 shrink-0" aria-label="Unread announcement" />;
  }
  if (status === 'read') {
    return <CheckCircle2 className="h-5 w-5 text-muted-foreground ml-2 shrink-0" aria-label="Read announcement" />;
  }
  return null;
}

export function AnnouncementItem({ announcement }: AnnouncementItemProps) {
  return (
    <Card className="flex flex-col overflow-hidden shadow-lg transition-all hover:shadow-xl animate-fadeIn bg-card">
      {announcement.imageUrl && (
        <div className="relative h-48 w-full">
          <Image
            src={announcement.imageUrl}
            alt={announcement.title}
            fill // Replaced layout="fill" and objectFit="cover" with fill for Next 13+
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" // Example sizes, adjust as needed
            style={{ objectFit: 'cover' }} // objectFit is now a style property
            data-ai-hint={announcement.imageHint || "announcement relevant"}
          />
        </div>
      )}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-xl font-semibold">{announcement.title}</CardTitle>
          <StatusIndicator status={announcement.status} />
        </div>
        <CardDescription className="flex items-center text-xs text-muted-foreground pt-1">
          <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
          Posted on {format(announcement.date, "MMMM d, yyyy")} by {announcement.author}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0 flex-grow">
        <p className="whitespace-pre-line text-sm leading-relaxed text-card-foreground/90">{announcement.content}</p>
      </CardContent>
    </Card>
  );
}
