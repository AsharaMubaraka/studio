
"use client";

import { useState, useEffect } from "react";
import type { Metadata } from "next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Youtube, PlayCircle, AlertCircle } from "lucide-react";

// export const metadata: Metadata = { // Cannot be used in client component
//   title: "Live Relay",
// };

const extractVideoId = (urlOrId: string): string | null => {
  if (!urlOrId) return null;
  // Check if it's just an ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(urlOrId)) {
    return urlOrId;
  }
  // Check for full YouTube URL
  const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = urlOrId.match(regex);
  return match ? match[1] : null;
};


export default function LiveRelayPage() {
  const [videoIdInput, setVideoIdInput] = useState("");
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Live Relay | Anjuman Hub";
    // Optionally load a default video ID from query params or localStorage
    // For example, load a default video for demonstration:
    // setVideoIdInput("dQw4w9WgXcQ"); 
    // setCurrentVideoId("dQw4w9WgXcQ");
  }, []);

  const handleLoadVideo = () => {
    const extractedId = extractVideoId(videoIdInput);
    if (extractedId) {
      setCurrentVideoId(extractedId);
      setInputError(null);
    } else {
      setInputError("Please enter a valid YouTube Video ID or URL.");
      setCurrentVideoId(null);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-bold tracking-tight flex items-center">
            <Youtube className="mr-3 h-8 w-8 text-primary" /> Live Relay
          </CardTitle>
          <CardDescription>
            Watch live YouTube broadcasts and events. Enter a YouTube Video ID or URL below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter YouTube Video ID or URL"
              value={videoIdInput}
              onChange={(e) => setVideoIdInput(e.target.value)}
              className={inputError ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            <Button onClick={handleLoadVideo}>
              <PlayCircle className="mr-2 h-4 w-4" /> Load Video
            </Button>
          </div>
          {inputError && (
             <p className="text-sm text-destructive flex items-center">
              <AlertCircle className="mr-1 h-4 w-4" /> {inputError}
            </p>
          )}
        </CardContent>
      </Card>

      {currentVideoId ? (
        <Card className="shadow-lg aspect-video overflow-hidden">
          <CardContent className="p-0 h-full">
            <iframe
              src={`https://www.youtube.com/embed/${currentVideoId}?autoplay=1&rel=0`}
              title="YouTube Live Relay"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="h-full w-full"
            />
          </CardContent>
        </Card>
      ) : (
        <Alert variant="default" className="shadow-md">
          <Youtube className="h-5 w-5" />
          <AlertTitle>No Video Loaded</AlertTitle>
          <AlertDescription>
            Enter a YouTube Video ID or URL above and click "Load Video" to start watching.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
