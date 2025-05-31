
"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, CalendarDays, Sparkle, Mail, CheckCircle2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import Image from "next/image";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: Date;
  author: string;
  status: 'new' | 'unread' | 'read';
  imageUrl?: string;
  imageHint?: string;
  readByUserIds?: string[];
}

interface AnnouncementItemProps {
  announcement: Announcement;
  onCardClick?: (id: string) => void;
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
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);

  const handleCardClick = () => {
    if (onCardClick) {
      onCardClick(announcement.id);
    }
  };

  const handleDownloadImage = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation(); // Prevent card click if this button is inside the clickable card area
    if (!announcement.imageUrl) return;

    setIsDownloading(true);
    try {
      const response = await fetch(announcement.imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = objectUrl;

      let filename = "downloaded_image";
      try {
        // Try to get filename from URL
        const url = new URL(announcement.imageUrl);
        const pathnameParts = url.pathname.split('/');
        const lastPart = pathnameParts[pathnameParts.length - 1];
        if (lastPart) {
          filename = lastPart.replace(/[^a-zA-Z0-9_.-]/g, '_'); // Sanitize
        }

        // Try to get extension from blob type or URL
        const extensionFromUrl = announcement.imageUrl.split('.').pop()?.split(/[?#]/)[0]?.toLowerCase();
        const typeExtension = blob.type.split('/')[1]?.toLowerCase();

        if (!filename.includes('.')) { // If no extension in filename part
            if (typeExtension && ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(typeExtension)) {
                filename += `.${typeExtension}`;
            } else if (extensionFromUrl && ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extensionFromUrl)) {
                filename += `.${extensionFromUrl}`;
            } else {
                filename += '.png'; // Default extension
            }
        }
      } catch (e) {
        console.warn("Could not parse image URL for filename, using default.", e);
        filename = "downloaded_image.png"; 
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);

      toast({
        title: "Download Started",
        description: `Downloading ${filename}...`,
      });

    } catch (error: any) {
      console.error("Error downloading image:", error);
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: error.message || "Could not download image. The image host may not allow direct downloads or there's a network issue.",
      });
      // As a fallback, you could open the image in a new tab:
      // window.open(announcement.imageUrl, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Card 
      className="flex flex-col overflow-hidden shadow-lg transition-all hover:shadow-xl animate-fadeIn bg-card group"
      onClick={handleCardClick} // Removed cursor-pointer as the whole card might not always be clickable if button is distinct
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
          <CardTitle className="text-xl font-semibold" style={{cursor: onCardClick ? 'pointer' : 'default'}}>{announcement.title}</CardTitle>
          <StatusIndicator status={announcement.status} />
        </div>
        <CardDescription className="flex items-center text-xs text-muted-foreground pt-1">
          <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
          Posted on {format(announcement.date, "MMMM d, yyyy")} by {announcement.author}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0 flex-grow" style={{cursor: onCardClick ? 'pointer' : 'default'}}>
        <div 
          className="text-sm leading-relaxed text-card-foreground/90"
          dangerouslySetInnerHTML={{ __html: announcement.content.replace(/\n/g, '<br />') }} 
        />
      </CardContent>
      {announcement.imageUrl && (
        <CardFooter className="pt-3">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full" 
            onClick={handleDownloadImage}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {isDownloading ? "Downloading..." : "Download Image"}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
