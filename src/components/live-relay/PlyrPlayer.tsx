
"use client";

import React, { useRef, useEffect, useState } from 'react';
import Plyr, { type PlyrProps, type APITypes } from 'plyr-react';
import 'plyr/dist/plyr.css'; // Changed import path
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, VideoOff } from 'lucide-react';

interface PlyrPlayerProps {
  videoId: string;
}

const CustomPlyrPlayer: React.FC<PlyrPlayerProps> = ({ videoId }) => {
  const plyrRef = useRef<APITypes>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
    debug: process.env.NODE_ENV === 'development',
    events: ['ready', 'playing', 'error', 'enterfullscreen', 'exitfullscreen', 'canplay'],
  };

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    console.log(`PlyrPlayer: videoId prop changed to: ${videoId}`);
  }, [videoId]);

  const handleReady = (event: any) => {
    console.log("PlyrPlayer: 'ready' event fired from plyr-react.", event);
    setIsLoading(false);
    // const player = plyrRef.current?.plyr;
    // player?.play(); // autoplay is in options, but sometimes direct play is needed
  };

  const handleError = (event: any) => {
    console.error("PlyrPlayer: 'error' event fired from plyr-react.", event);
    let errorMessage = "An error occurred with the video player.";
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
    setIsLoading(false); // Ensure loading is false when playing starts
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
          onPlaying={handlePlaying}
          onError={handleError} // Assuming plyr-react has an onError prop
          onEnterFullscreen={handleEnterFullScreen}
          onExitFullscreen={handleExitFullScreen}
          onCanPlay={handleCanPlay}
        />
      </div>
    </div>
  );
};

export default CustomPlyrPlayer;
