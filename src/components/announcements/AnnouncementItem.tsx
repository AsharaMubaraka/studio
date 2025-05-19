
"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import Image from "next/image";
import { CalendarDays, Tag } from "lucide-react";

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string; // ISO string
  author: string;
  tags?: string[];
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
      {announcement.tags && announcement.tags.length > 0 && (
        <CardFooter className="flex flex-wrap gap-2">
          <Tag className="mr-1 h-4 w-4 text-muted-foreground" />
          {announcement.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="capitalize">
              {tag}
            </Badge>
          ))}
        </CardFooter>
      )}
    </Card>
  );
}
