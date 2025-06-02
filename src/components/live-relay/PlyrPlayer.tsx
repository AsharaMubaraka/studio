
"use client";

import React, { useRef } from 'react';
import Plyr, { type PlyrProps, type APITypes } from 'plyr-react';
import 'plyr/dist/plyr.css';

interface PlyrPlayerProps {
  videoId: string;
}

const CustomPlyrPlayerComponent: React.FC<PlyrPlayerProps> = ({ videoId }) => {
  const plyrRef = useRef<APITypes>(null);

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
    // debug: process.env.NODE_ENV === 'development', // Removed for leaner production
  };
  
  if (!videoId || !plyrSource) {
    return (
        <div className="aspect-video w-full h-full bg-black flex items-center justify-center text-white">
            Video ID not provided or invalid.
        </div>
    );
  }

  return (
    <div className="aspect-video w-full h-full bg-black">
      <Plyr
        key={videoId} 
        ref={plyrRef}
        source={plyrSource}
        options={plyrOptions}
      />
    </div>
  );
};

const PlyrPlayer = React.memo(CustomPlyrPlayerComponent);
export default PlyrPlayer;
