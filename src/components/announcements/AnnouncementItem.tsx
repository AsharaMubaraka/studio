
"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, CalendarDays, Sparkle, Mail, CheckCircle2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import Image from "next/image";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { formatWhatsAppTextToHtml } from "@/lib/utils";

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

  const handleDownloadFile = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation(); 
    if (!announcement.imageUrl) return;

    setIsDownloading(true);
    try {
      const response = await fetch(announcement.imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = objectUrl;

      let filename = "downloaded_file"; // Default generic name
      try {
        const url = new URL(announcement.imageUrl);
        const pathnameParts = url.pathname.split('/');
        const lastPart = pathnameParts[pathnameParts.length - 1];
        
        if (lastPart) {
          // Decode URI component and sanitize, keeping dots for extensions
          filename = decodeURIComponent(lastPart).replace(/[^a-zA-Z0-9_.-]/g, '_');
        }

        // If the derived filename doesn't have an extension, try to get one from blob type
        if (!filename.includes('.')) {
          const typeParts = blob.type.split('/');
          if (typeParts.length === 2 && typeParts[1] && typeParts[1].length < 6 && /^[a-z0-9]+$/.test(typeParts[1])) {
            // Use common simple extensions from MIME type e.g. jpeg, png, pdf, zip
            filename += `.${typeParts[1]}`;
          }
        }
      } catch (e) {
        console.warn("Could not parse URL for filename, using default.", e);
        // filename remains "downloaded_file" or can be appended with a generic extension if blob type is known
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

      toast({
        title: "Download Started",
        description: `Downloading ${filename}...`,
      });

    } catch (error: any) {
      console.error("Error downloading file:", error);
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: error.message || "Could not download file. The host may not allow direct downloads or there's a network issue.",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Card 
      className="flex flex-col overflow-hidden shadow-lg transition-all hover:shadow-xl animate-fadeIn bg-card group"
      onClick={handleCardClick}
    >
      {announcement.imageUrl && (
        <div className="aspect-video w-full relative overflow-hidden">
          <Image
            src={announcement.imageUrl}
            alt={announcement.title || "Announcement visual (may not render if not an image)"}
            fill
            className="object-contain transition-transform duration-300 group-hover:scale-105" // Changed to object-contain
            data-ai-hint={announcement.imageHint || "announcement visual"}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            onError={(e) => {
              // Optional: Hide image container or show placeholder on error if it's not an image
              // e.currentTarget.style.display = 'none'; 
            }}
          />
        </div>
      )}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle 
            className="text-xl font-semibold" 
            style={{cursor: onCardClick ? 'pointer' : 'default'}}
            dangerouslySetInnerHTML={{ __html: formatWhatsAppTextToHtml(announcement.title) }}
          />
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
            {isDownloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {isDownloading ? "Downloading..." : "Download File"}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
