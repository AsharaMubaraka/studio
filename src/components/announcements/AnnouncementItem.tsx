
"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { format } from "date-fns";
import Image from "next/image";
import { CalendarDays, Sparkle, Mail, CheckCircle2 } from "lucide-react";

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: Date;
  author: string;
  status: 'new' | 'unread' | 'read';
  imageUrl?: string;
  imageHint?: string;
}

interface AnnouncementItemProps {
  announcement: Announcement;
  onCardClick?: (id: string) => void; // Added onCardClick prop
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

export function AnnouncementItem({ announcement, onCardClick }: AnnouncementItemProps) {
  const handleCardClick = () => {
    if (onCardClick) {
      onCardClick(announcement.id);
    }
  };

  return (
    <Card 
      className="flex flex-col overflow-hidden shadow-lg transition-all hover:shadow-xl animate-fadeIn bg-card cursor-pointer group"
      onClick={handleCardClick} // Added onClick handler to the Card
    >
      {announcement.imageUrl && (
        <div className="aspect-video w-full relative overflow-hidden">
          <Image
            src={announcement.imageUrl}
            alt={announcement.title || "Announcement image"}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            data-ai-hint={announcement.imageHint || "announcement visual"}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
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
        <div 
          className="text-sm leading-relaxed text-card-foreground/90"
          dangerouslySetInnerHTML={{ __html: announcement.content.replace(/\n/g, '<br />') }} 
        />
      </CardContent>
      {announcement.imageUrl && (
        <CardFooter className="pt-3">
          <Button variant="outline" size="sm" asChild className="w-full">
            <a href={announcement.imageUrl} download target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
              <Download className="mr-2 h-4 w-4" />
              Download Image
            </a>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
