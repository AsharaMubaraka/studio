
"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
// Removed Button and Download icon as they were for image download
import { format } from "date-fns";
// Removed Image from next/image
import { CalendarDays, Sparkle, Mail, CheckCircle2 } from "lucide-react";

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: Date;
  author: string;
  status: 'new' | 'unread' | 'read';
  // imageUrl?: string; // Removed imageUrl
  // imageHint?: string; // Removed imageHint
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
      {/* Removed image display block */}
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
        <div 
          className="text-sm leading-relaxed text-card-foreground/90"
          dangerouslySetInnerHTML={{ __html: announcement.content.replace(/\n/g, '<br />') }} 
        />
      </CardContent>
      {/* Removed CardFooter with image download button */}
    </Card>
  );
}
