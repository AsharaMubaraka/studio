
"use client";

import React, { useRef, useEffect } from 'react';
import Plyr, { type PlyrProps, type APITypes } from 'plyr-react';
import 'plyr/dist/plyr.css';

interface PlyrPlayerProps {
  videoId: string;
}

const CustomPlyrPlayerComponent: React.FC<PlyrPlayerProps> = ({ videoId }) => {
  const prevVideoIdRef = useRef<string>();
  const plyrRef = useRef<APITypes>(null);

  useEffect(() => {
    if (prevVideoIdRef.current !== videoId) {
      console.log(`PlyrPlayer: videoId prop changed from "${prevVideoIdRef.current}" to "${videoId}". Player will re-initialize due to key prop on <Plyr />.`);
    }
    prevVideoIdRef.current = videoId;
  }, [videoId]);

  useEffect(() => {
    console.log(`PlyrPlayer: Component instance for videoId "${videoId}" mounted or updated.`);
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
    debug: process.env.NODE_ENV === 'development',
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
      <Plyr
        key={videoId} // Forces re-mount on videoId change for clean player state
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
            const plyrInstance = plyrRef.current?.plyr;
            if (plyrInstance && plyrInstance.source && typeof plyrInstance.source === 'string' && plyrInstance.source.includes(videoId)) {
                 console.error(`PlyrPlayer: The error might be related to video ID "${videoId}". Check for embedding restrictions or 403 errors in the Network tab.`);
            }
        }}
        onPlaying={() => {
            console.log("PlyrPlayer: onPlaying event from Plyr for videoId:", videoId);
        }}
      />
    </div>
  );
};

// Wrap with React.memo
const PlyrPlayer = React.memo(CustomPlyrPlayerComponent);
export default PlyrPlayer;
