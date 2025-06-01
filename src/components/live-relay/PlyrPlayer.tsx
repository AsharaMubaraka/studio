
"use client";

import React, { useRef, useEffect } from 'react';
import Plyr, { type PlyrProps, type APITypes } from 'plyr-react';
import 'plyr/dist/plyr.css';

interface PlyrPlayerProps {
  videoId: string;
}

const CustomPlyrPlayer: React.FC<PlyrPlayerProps> = ({ videoId }) => {
  const prevVideoIdRef = useRef<string>();
  const plyrRef = useRef<APITypes>(null);

  useEffect(() => {
    if (prevVideoIdRef.current !== videoId) {
      console.log(`PlyrPlayer: videoId prop changed from "${prevVideoIdRef.current}" to "${videoId}". Player will re-initialize due to key prop on <Plyr />.`);
    }
    prevVideoIdRef.current = videoId;
  }, [videoId]);

  useEffect(() => {
    // This effect logs when the component instance itself mounts or when videoId causes it to update.
    console.log(`PlyrPlayer: Component instance for videoId "${videoId}" mounted or updated.`);
    return () => {
      console.log(`PlyrPlayer: Component instance for videoId "${videoId}" unmounting.`);
    };
  }, [videoId]); // This dependency means the effect re-runs if videoId changes, which is fine.

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
    debug: process.env.NODE_ENV === 'development', // Enable Plyr's own debug logs in development
    // You can add more specific Plyr options here if needed, e.g., controls
    // autoplay: false, // It's generally safer to keep autoplay off by default
  };
  
  if (!videoId || !plyrSource) {
    console.warn("PlyrPlayer: No videoId or source provided. Rendering placeholder.");
    return (
        <div className="aspect-video w-full h-full bg-black flex items-center justify-center text-white">
            Video ID not provided or invalid.
        </div>
    );
  }

  console.log(`PlyrPlayer: Rendering <Plyr /> for videoId: ${videoId} with source:`, plyrSource);

  return (
    <div className="aspect-video w-full h-full bg-black">
      {/* The key={videoId} prop is crucial. 
          It tells React to create a new instance of the Plyr component (and thus the player) 
          when the videoId changes. This is usually the cleanest way to handle source changes.
      */}
      <Plyr
        key={videoId}
        ref={plyrRef}
        source={plyrSource}
        options={plyrOptions}
        onReady={(event) => {
            console.log("PlyrPlayer: onReady event from Plyr for videoId:", videoId, event);
            const player = plyrRef.current?.plyr;
            if (player) {
              console.log("PlyrPlayer: Player instance (onReady):", player);
            }
        }}
        onError={(event) => {
            console.error("PlyrPlayer: onError event from Plyr for videoId:", videoId, "Error event:", event);
            // Check if the error might be related to YouTube restrictions
            const plyrInstance = plyrRef.current?.plyr;
            if (plyrInstance && plyrInstance.source && typeof plyrInstance.source === 'string' && plyrInstance.source.includes(videoId)) {
                 console.error(`PlyrPlayer: The error might be related to video ID "${videoId}". Check for embedding restrictions or 403 errors in the Network tab.`);
            }
        }}
        onPlaying={() => {
            console.log("PlyrPlayer: onPlaying event from Plyr for videoId:", videoId);
        }}
        // Add other event handlers if needed, e.g., onPause, onEnded, etc.
      />
    </div>
  );
};

export default CustomPlyrPlayer;
