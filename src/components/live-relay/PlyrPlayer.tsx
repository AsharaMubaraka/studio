
"use client";

import React, { useRef } from 'react';
import Plyr, { type PlyrProps, type APITypes } from 'plyr-react';
import 'plyr/dist/plyr.css';

interface PlyrPlayerProps {
  videoId: string;
}

// Inner component that actually renders Plyr, keyed by videoId
const ActualPlayer: React.FC<{ videoId: string }> = ({ videoId }) => {
  const plyrRef = useRef<APITypes>(null);

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
    // Options can be added here if needed, e.g.:
    // controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen'],
    // autoplay: false,
  };

  return (
    <Plyr
      ref={plyrRef}
      source={plyrSource}
      options={plyrOptions}
    />
  );
};

const CustomPlyrPlayerComponent: React.FC<PlyrPlayerProps> = ({ videoId }) => {
  if (!videoId) {
    return (
      <div className="aspect-video w-full h-full bg-black flex items-center justify-center text-white">
        Video ID not provided or invalid.
      </div>
    );
  }

  return (
    // This div defines the layout space for the player.
    // It relies on its parent in live-relay/page.tsx (CardContent) for aspect-ratio.
    // The h-full and w-full ensure it fills this parent.
    <div className="w-full h-full bg-black">
      <ActualPlayer key={videoId} videoId={videoId} />
    </div>
  );
};

const PlyrPlayer = React.memo(CustomPlyrPlayerComponent);
export default PlyrPlayer;
