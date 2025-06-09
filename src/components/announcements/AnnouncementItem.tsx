
"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, CalendarDays, Sparkle, Mail, CheckCircle2, Loader2, Tag, Clock } from "lucide-react"; // Added Clock
import { format } from "date-fns";
import Image from "next/image";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { formatWhatsAppTextToHtml } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { NotificationCategory } from "@/config/site";

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: Date; // Effective post date (could be createdAt or past scheduledAt)
  author: string;
  status: 'new' | 'unread' | 'read' | 'scheduled'; // 'scheduled' means future, not yet active for user
  imageUrl?: string;
  imageHint?: string;
  category?: NotificationCategory;
  readByUserIds?: string[];
  scheduledAt?: Date | null; // Original scheduled time
  internalStatus?: 'draft' | 'scheduled' | 'sent'; // Firestore status
}

interface AnnouncementItemProps {
  announcement: Announcement;
  onCardClick?: (id: string) => void;
}

function StatusIndicator({ status, scheduledAt, internalStatus }: { status: Announcement['status'], scheduledAt?: Date | null, internalStatus?: Announcement['internalStatus'] }) {
  const now = new Date();
  if (internalStatus === 'scheduled' && scheduledAt && scheduledAt > now) {
    // This case should ideally be filtered out before display for regular users, but good for preview
    return <Clock className="h-5 w-5 text-blue-500 ml-2 shrink-0" aria-label="Scheduled for future" />;
  }
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
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);

  const handleCardClick = () => {
    if (onCardClick && announcement.status !== 'scheduled') { // Don't mark as read if it's a future scheduled preview
      onCardClick(announcement.id);
    }
  };

  const handleDownloadFile = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!announcement.imageUrl) return;
    setIsDownloading(true);
    try {
      const response = await fetch(announcement.imageUrl);
      if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      let filename = "downloaded_file";
      try {
        const url = new URL(announcement.imageUrl);
        const pathnameParts = url.pathname.split('/');
        const lastPart = pathnameParts[pathnameParts.length - 1];
        if (lastPart) filename = decodeURIComponent(lastPart).replace(/[^a-zA-Z0-9_.-]/g, '_');
        if (!filename.includes('.')) {
          const typeParts = blob.type.split('/');
          if (typeParts.length === 2 && typeParts[1] && typeParts[1].length < 6 && /^[a-z0-9]+$/.test(typeParts[1])) {
            filename += `.${typeParts[1]}`;
          }
        }
      } catch (e) {
         if (blob.type && blob.type !== 'application/octet-stream') {
            const ext = blob.type.split('/')[1];
            if (ext) filename += `.${ext}`;
        }
      }
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
      toast({ title: "Download Started", description: `Downloading ${filename}...` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Download Failed", description: error.message || "Could not download." });
    } finally {
      setIsDownloading(false);
    }
  };

  const displayDate = announcement.date; // This is already effective post date
  const isFutureScheduledPreview = announcement.status === 'scheduled' && announcement.scheduledAt && announcement.scheduledAt > new Date();


  return (
    <Card
      className="flex flex-col overflow-hidden shadow-lg transition-all hover:shadow-xl animate-fadeIn bg-card group"
      onClick={handleCardClick}
    >
      {announcement.imageUrl && (
        <div className="aspect-video w-full relative overflow-hidden">
          <Image
            src={announcement.imageUrl}
            alt={announcement.title || "Announcement visual"}
            fill
            className="object-contain transition-transform duration-300 group-hover:scale-105"
            data-ai-hint={announcement.imageHint || "announcement visual"}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      )}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle
            className="text-xl font-semibold"
            style={{cursor: onCardClick && !isFutureScheduledPreview ? 'pointer' : 'default'}}
            dangerouslySetInnerHTML={{ __html: formatWhatsAppTextToHtml(announcement.title) }}
          />
          <StatusIndicator status={announcement.status} scheduledAt={announcement.scheduledAt} internalStatus={announcement.internalStatus} />
        </div>
        <CardDescription className="flex items-center text-xs text-muted-foreground pt-1 flex-wrap gap-x-2">
          <span className="flex items-center">
            <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
            {isFutureScheduledPreview && announcement.scheduledAt 
              ? `Scheduled for ${format(announcement.scheduledAt, "MMMM d, yyyy 'at' h:mm a")}`
              : `Posted on ${format(displayDate, "MMMM d, yyyy")} by ${announcement.author}`
            }
          </span>
          {announcement.category && (
            <Badge variant="secondary" className="mt-1 sm:mt-0 flex items-center gap-1">
                <Tag className="h-3 w-3" />
                {announcement.category}
            </Badge>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0 flex-grow" style={{cursor: onCardClick && !isFutureScheduledPreview ? 'pointer' : 'default'}}>
        <div
          className="text-sm leading-relaxed text-card-foreground/90"
          dangerouslySetInnerHTML={{ __html: formatWhatsAppTextToHtml(announcement.content) }}
        />
      </CardContent>
      {announcement.imageUrl && (
        <CardFooter className="pt-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleDownloadFile}
            disabled={isDownloading}
          >
            {isDownloading ? (<Loader2 className="mr-2 h-4 w-4 animate-spin" />) : (<Download className="mr-2 h-4 w-4" />)}
            {isDownloading ? "Downloading..." : "Download File"}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
