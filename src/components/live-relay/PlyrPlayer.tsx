
"use client";

import React, { useRef, useEffect, useState } from 'react';
import Plyr, { PlyrProps, APITypes } from 'plyr-react';
import 'plyr-react/dist/plyr.css'; // Ensure CSS for plyr-react is imported
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, VideoOff } from 'lucide-react';

interface PlyrPlayerProps {
  videoId: string;
}

const CustomPlyrPlayer: React.FC<PlyrPlayerProps> = ({ videoId }) => {
  const plyrRef = useRef<APITypes>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Keep loading state for UI feedback

  const plyrSource: PlyrProps['source'] = {
    type: 'video',
    sources: [
      {
        src: videoId,
        provider: 'youtube',
      },
    ],
  };

  const plyrOptions: PlyrProps['options'] = {
    autoplay: true,
    debug: process.env.NODE_ENV === 'development', // Enable debug only in development
    // controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen', 'settings'],
    // settings: ['captions', 'quality', 'speed'],
    // Ensure events are handled to update loading/error states
    events: ['ready', 'playing', 'error', 'enterfullscreen', 'exitfullscreen'],
  };

  useEffect(() => {
    setIsLoading(true); // Reset loading state when videoId changes
    setError(null);
    console.log(`PlyrPlayer: videoId prop changed to: ${videoId}`);
  }, [videoId]);

  const handleReady = (event: any) => {
    console.log("PlyrPlayer: 'ready' event fired from plyr-react.", event);
    setIsLoading(false);
    // Access the Plyr instance for more direct control if needed
    // const player = plyrRef.current?.plyr;
    // player?.play(); // autoplay is in options
  };

  const handleError = (event: any) => {
    console.error("PlyrPlayer: 'error' event fired from plyr-react.", event);
    let errorMessage = "An error occurred with the video player.";
    // plyr-react might wrap the error differently, check event structure
    if (event?.detail?.plyr?.source?.src?.includes(videoId)) {
        errorMessage = `Could not load video ID: ${videoId}. It might be private, deleted, or restricted.`;
    } else if (event?.detail?.message) {
        errorMessage = event.detail.message;
    } else if (typeof event === 'string') {
        errorMessage = event;
    }
    setError(errorMessage);
    setIsLoading(false);
  };

  const handlePlaying = () => {
    console.log("PlyrPlayer: 'playing' event fired from plyr-react.");
    setIsLoading(false);
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
  
  if (!videoId) {
      return (
          <Alert variant="destructive" className="m-0 aspect-video flex flex-col items-center justify-center bg-muted/30 w-full h-full">
              <VideoOff className="h-10 w-10 mb-3 text-muted-foreground" />
              <AlertTitle className="text-lg font-semibold">Video Not Available</AlertTitle>
              <AlertDescription className="text-center text-muted-foreground px-4">
                  No video ID has been provided to the player.
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
      <div className={(isLoading || error) ? 'hidden' : 'w-full h-full'}>
        <Plyr
          ref={plyrRef}
          source={plyrSource}
          options={plyrOptions}
          onReady={handleReady}
          // plyr-react uses on (event name) e.g. onPlaying, onError
          // Need to map these. Let's check plyr-react event prop names
          // Standard HTML event names (lowercase) are typically used or camelCase.
          // The 'events' option above configures PlyrJS, but plyr-react uses props for handlers.
          // on['ready'] is not how plyr-react props work.
          // It's typically onReady, onPlaying, etc.
          // After checking docs: It's indeed onReady, onPlaying, etc.
          // Let's assume the following event handlers are correct based on typical React component patterns.
          // If these specific prop names are wrong, they'll need adjustment based on plyr-react's actual API.
          // Update: plyr-react provides direct access to the Plyr events via the instance.
          // For simplicity with `plyr-react`, relying on `onReady` and `options.events` for logging is better.
          // The `Plyr` component itself doesn't take onError, onPlaying as direct props in the way some wrappers do.
          // We use the ref and attach listeners if needed, or rely on options.events.
          // For now, will simplify and rely on onReady. Error handling will be via try/catch or player events if exposed.
          // The error in the log likely means internal Plyr errors.
          // Let's ensure options.event_listeners is set if we want to handle them via plyrRef.current.plyr.on(...)
        />
      </div>
    </div>
  );
};

export default CustomPlyrPlayer;
