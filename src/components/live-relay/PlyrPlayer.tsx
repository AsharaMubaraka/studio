
"use client";

import React, { useRef, useEffect, useState } from 'react';
import PlyrJS, { Options as PlyrOptions, SourceInfo } from 'plyr';
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
    console.log(`PlyrPlayer: useEffect triggered. videoId: ${videoId}`);

    if (!videoRef.current) {
      console.error("PlyrPlayer: videoRef.current is null. Aborting initialization.");
      // This case should ideally not happen if the component is structured correctly
      // but as a fallback, ensure loading is false.
      setIsLoading(false);
      setError("Player internal error: video element not found.");
      return;
    }

    if (!videoId) {
      console.log("PlyrPlayer: No videoId provided. Setting error state.");
      setError("No video ID provided.");
      setIsLoading(false);
      return;
    }

    // Start loading sequence
    setIsLoading(true);
    setError(null);
    console.log("PlyrPlayer: isLoading set to true, error set to null.");

    const plyrSource: SourceInfo = {
      type: 'video',
      sources: [
        {
          src: videoId,
          provider: 'youtube',
        },
      ],
    };

    // Enable debug mode for more console output from Plyr
    const plyrOptions: PlyrOptions = {
      autoplay: true,
      debug: true, // Enable Plyr's debug mode
      // controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen', 'settings'],
      // settings: ['captions', 'quality', 'speed'],
    };

    try {
      // If a player instance already exists, destroy it before creating a new one
      if (playerInstanceRef.current) {
        console.log("PlyrPlayer: Destroying existing player instance.");
        playerInstanceRef.current.destroy();
        playerInstanceRef.current = null;
      }

      console.log("PlyrPlayer: Initializing new PlyrJS instance.");
      const player = new PlyrJS(videoRef.current, plyrOptions);
      playerInstanceRef.current = player;
      console.log("PlyrPlayer: PlyrJS instance created.", player);

      // Event listeners
      player.on('ready', () => {
        console.log("PlyrPlayer: 'ready' event fired.");
        setIsLoading(false);
        // player.play(); // Autoplay is in options, but can be called explicitly if needed
      });

      player.on('error', (event: any) => {
        console.error("PlyrPlayer: 'error' event fired.", event.detail);
        let errorMessage = "An error occurred with the video player.";
        // Check if detail and plyr object exist, and if source is part of detail
        if (event?.detail?.plyr?.source?.src?.includes(videoId)) {
          errorMessage = `Could not load video ID: ${videoId}. It might be private, deleted, or restricted.`;
        } else if (event?.detail?.message) {
          errorMessage = event.detail.message;
        }
        setError(errorMessage);
        setIsLoading(false);
      });

      player.on('playing', () => {
        console.log("PlyrPlayer: 'playing' event fired.");
        setIsLoading(false); // Ensure loader is hidden when playing starts
      });

      player.on('loadstart', () => console.log("PlyrPlayer: 'loadstart' event fired."));
      player.on('loadeddata', () => console.log("PlyrPlayer: 'loadeddata' event fired."));
      player.on('canplay', () => console.log("PlyrPlayer: 'canplay' event fired."));
      player.on('stalled', () => console.log("PlyrPlayer: 'stalled' event fired. Player might be having trouble loading media."));
      player.on('waiting', () => console.log("PlyrPlayer: 'waiting' event fired. Player is waiting for data."));


      player.on('enterfullscreen', () => {
        console.log("PlyrPlayer: 'enterfullscreen' event fired.");
        if (screen.orientation && typeof screen.orientation.lock === 'function') {
          screen.orientation.lock('landscape').catch(err => console.warn("PlyrPlayer: Could not lock orientation:", err));
        }
      });
      player.on('exitfullscreen', () => {
        console.log("PlyrPlayer: 'exitfullscreen' event fired.");
        if (screen.orientation && typeof screen.orientation.unlock === 'function') {
          screen.orientation.unlock();
        }
      });

      // Set the source for the player
      console.log("PlyrPlayer: Setting player source:", plyrSource);
      player.source = plyrSource;
      console.log("PlyrPlayer: Player source set.");

    } catch (e: any) {
      console.error("PlyrPlayer: Failed to initialize Plyr player in try-catch block.", e);
      setError(`Failed to initialize player: ${e.message}`);
      setIsLoading(false);
    }

    // Cleanup function
    return () => {
      if (playerInstanceRef.current) {
        console.log("PlyrPlayer: useEffect cleanup - Destroying player instance.");
        playerInstanceRef.current.destroy();
        playerInstanceRef.current = null;
      } else {
        console.log("PlyrPlayer: useEffect cleanup - No player instance to destroy.");
      }
    };
  }, [videoId]); // Re-run effect if videoId changes

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
      {/* The video element that Plyr will attach to. Hidden if loading or error. */}
      <video ref={videoRef} className={(isLoading || error) ? 'hidden' : ''} playsInline />
    </div>
  );
};

export default PlyrPlayer;
