
"use client";

import React, { useRef, useEffect, useState } from 'react';
import Plyr, { type PlyrProps, type APITypes } from 'plyr-react';
import 'plyr/dist/plyr.css';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, VideoOff } from 'lucide-react';

interface PlyrPlayerProps {
  videoId: string;
}

const CustomPlyrPlayer: React.FC<PlyrPlayerProps> = ({ videoId }) => {
  const plyrRef = useRef<APITypes>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log(`PlyrPlayer: Component instance for videoId "${videoId}" mounted or videoId changed.`);
    setIsLoading(true);
    setError(null);

    return () => {
      console.log(`PlyrPlayer: Component instance for videoId "${videoId}" unmounting.`);
    };
  }, [videoId]);

  const plyrSource: PlyrProps['source'] | null = videoId ? {
    type: 'video',
    sources: [
      {
        src: videoId,
        provider: 'youtube',
      },
    ],
  } : null;

  const plyrOptions: PlyrProps['options'] = {
    // autoplay: false, // Keep autoplay off
    debug: process.env.NODE_ENV === 'development',
    events: ['ready', 'playing', 'error', 'enterfullscreen', 'exitfullscreen', 'canplay', 'loadstart'],
    controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'captions', 'settings', 'pip', 'airplay', 'fullscreen'],
  };

  const handleLoadStart = (event: any) => {
    console.log("PlyrPlayer: 'loadstart' event fired.", event);
    setIsLoading(true); // Explicitly set loading on loadstart
  };

  const handleReady = (event: any) => {
    console.log("PlyrPlayer: 'ready' event fired from plyr-react.", event);
    setIsLoading(false);
    const player = plyrRef.current?.plyr;
    if (player) {
      console.log("PlyrPlayer: Player instance onReady:", player);
    } else {
      console.warn("PlyrPlayer: Plyr instance not available onReady in ref.");
    }
  };

  const handleError = (event: any) => {
    console.error("PlyrPlayer: 'error' event fired from plyr-react.", event);
    let errorMessage = "An error occurred with the video player.";
    if (event?.detail?.plyr?.source?.src?.includes(videoId)) {
        errorMessage = `Could not load video ID: ${videoId}. It might be private, deleted, or restricted. Check browser console (Network tab) for 403 errors from YouTube.`;
    } else if (event?.detail?.message) {
        errorMessage = event.detail.message;
    } else if (typeof event === 'string') {
        errorMessage = event;
    } else if (event?.message) { // General Error object
        errorMessage = event.message;
    }
    setError(errorMessage);
    setIsLoading(false);
  };
  
  const handlePlaying = () => {
    console.log("PlyrPlayer: 'playing' event fired from plyr-react.");
    setIsLoading(false);
    setError(null); // Clear error if playing starts
  };

  const handleCanPlay = () => {
    console.log("PlyrPlayer: 'canplay' event fired from plyr-react.");
    setIsLoading(false); // Should be ready to play now
  };

  const handleEnterFullScreen = () => {
    console.log("PlyrPlayer: 'enterfullscreen' event fired.");
    if (screen.orientation && typeof screen.orientation.lock === 'function') {
      screen.orientation.lock('landscape').catch(err => console.warn("PlyrPlayer: Could not lock orientation:", err));
    }
  };

  const handleExitFullScreen = () => {
    console.log("PlyrPlayer: 'exitfullscreen' event fired.");
    if (screen.orientation && typeof screen.orientation.unlock === 'function') {
      screen.orientation.unlock();
    }
  };
  
  if (!videoId || !plyrSource) {
      return (
          <Alert variant="destructive" className="m-0 aspect-video flex flex-col items-center justify-center bg-muted/30 w-full h-full">
              <VideoOff className="h-10 w-10 mb-3 text-muted-foreground" />
              <AlertTitle className="text-lg font-semibold">Video Not Available</AlertTitle>
              <AlertDescription className="text-center text-muted-foreground px-4">
                  No valid video ID has been provided to the player.
              </AlertDescription>
          </Alert>
      );
  }

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
      {/* Key the Plyr component with the videoId to force re-initialization on change */}
      {/* Conditionally render Plyr only when not actively showing a critical error or initial load */}
      <div className={(isLoading || error) ? 'hidden' : 'w-full h-full'}>
        <Plyr
          key={videoId} 
          ref={plyrRef}
          source={plyrSource}
          options={plyrOptions}
          onReady={handleReady}
          onPlaying={handlePlaying}
          onError={handleError}
          onEnterFullscreen={handleEnterFullScreen}
          onExitFullscreen={handleExitFullScreen}
          onCanPlay={handleCanPlay}
          onLoadStart={handleLoadStart}
        />
      </div>
    </div>
  );
};

export default CustomPlyrPlayer;
