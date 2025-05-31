
"use client";

import React, { useRef, useEffect, useState } from 'react';
import PlyrJS, { Options as PlyrOptions, SourceInfo } from 'plyr'; // Using PlyrJS directly
import 'plyr/dist/plyr.css';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, VideoOff } from 'lucide-react';

interface PlyrPlayerProps {
  videoId: string;
}

const PlyrPlayer: React.FC<PlyrPlayerProps> = ({ videoId }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerInstanceRef = useRef<PlyrJS | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!videoId || !videoRef.current) {
      setIsLoading(false);
      if (!videoId) setError("No video ID provided.");
      return;
    }

    setIsLoading(true);
    setError(null);

    constplyrSource: SourceInfo = {
      type: 'video',
      sources: [
        {
          src: videoId,
          provider: 'youtube',
        },
      ],
    };

    const plyrOptions: PlyrOptions = {
      autoplay: true,
      // Add other Plyr options as needed
      // controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen', 'settings'],
      // settings: ['captions', 'quality', 'speed'], // Example settings
    };

    try {
      if (playerInstanceRef.current) {
        playerInstanceRef.current.destroy();
      }
      
      const player = new PlyrJS(videoRef.current, plyrOptions);
      playerInstanceRef.current = player;

      player.source = plyrSource;

      player.on('ready', () => {
        setIsLoading(false);
        // player.play(); // Ensure autoplay if not handled by options
      });

      player.on('error', (event: any) => {
        console.error("Plyr Error:", event);
        let errorMessage = "An error occurred with the video player.";
        if (event?.detail?.plyr?.source?.includes(videoId)) {
          errorMessage = `Could not load video ID: ${videoId}. It might be private, deleted, or restricted.`;
        }
        setError(errorMessage);
        setIsLoading(false);
      });
      
      player.on('playing', () => setIsLoading(false)); // Hide loader once playing
      player.on('enterfullscreen', () => {
         // Attempt to lock screen orientation on fullscreen enter if API available
        if (screen.orientation && typeof screen.orientation.lock === 'function') {
          screen.orientation.lock('landscape').catch(err => console.warn("Could not lock orientation:", err));
        }
      });
      player.on('exitfullscreen', () => {
        // Attempt to unlock screen orientation on fullscreen exit if API available
        if (screen.orientation && typeof screen.orientation.unlock === 'function') {
          screen.orientation.unlock();
        }
      });


    } catch (e: any) {
      console.error("Failed to initialize Plyr player:", e);
      setError(`Failed to initialize player: ${e.message}`);
      setIsLoading(false);
    }

    return () => {
      if (playerInstanceRef.current) {
        playerInstanceRef.current.destroy();
        playerInstanceRef.current = null;
      }
    };
  }, [videoId]);

  return (
    <div className="aspect-video w-full h-full bg-black relative">
      {isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black text-white z-10">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading Player...</span>
        </div>
      )}
      {error && (
         <Alert variant="destructive" className="m-0 aspect-video flex flex-col items-center justify-center bg-muted/30 w-full h-full">
            <VideoOff className="h-10 w-10 mb-3 text-muted-foreground" />
            <AlertTitle className="text-lg font-semibold">Video Player Error</AlertTitle>
            <AlertDescription className="text-center text-muted-foreground px-4">
                {error}
            </AlertDescription>
        </Alert>
      )}
      {/* The video element that Plyr will attach to. Style to be hidden when loading/error */}
      <video ref={videoRef} className={(isLoading || error) ? 'hidden' : ''} playsInline />
    </div>
  );
};

export default PlyrPlayer;
