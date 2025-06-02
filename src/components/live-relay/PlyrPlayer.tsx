
"use client";

import React, { useRef, useState, useEffect } from 'react';
import Plyr, { type PlyrProps, type APITypes } from 'plyr-react';
import 'plyr/dist/plyr.css';

interface PlyrPlayerProps {
  videoId: string;
}

const CustomPlyrPlayerComponent: React.FC<PlyrPlayerProps> = ({ videoId }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const plyrRef = useRef<APITypes>(null);
  const [isContainerReady, setIsContainerReady] = useState(false);

  useEffect(() => {
    if (containerRef.current) {
      setIsContainerReady(true);
    }
  }, []); // Runs once after initial render of the container

  if (!videoId) {
    return (
        <div className="aspect-video w-full h-full bg-black flex items-center justify-center text-white">
            Video ID not provided or invalid.
        </div>
    );
  }

  return (
    // Rely on parent for aspect-ratio, this div just fills the parent.
    <div ref={containerRef} className="w-full h-full bg-black">
      {isContainerReady ? (
        (() => {
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
            // No debug options needed for production
          };

          return (
            <Plyr
              key={videoId} // This is important!
              ref={plyrRef}
              source={plyrSource}
              options={plyrOptions}
            />
          );
        })()
      ) : (
        // This loader is usually very brief as the parent dynamic import handles the main loading state.
        // It ensures nothing attempts to render if the container isn't ready for some reason.
        <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-black">
          {/* Intentionally empty or minimal loader as parent handles visible skeleton */}
        </div>
      )}
    </div>
  );
};

const PlyrPlayer = React.memo(CustomPlyrPlayerComponent);
export default PlyrPlayer;
