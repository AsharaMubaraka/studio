
"use client";

import React, { useEffect } from 'react';
import { Player, Youtube, DefaultUi } from '@vime/react';

interface VimePlayerProps {
  videoId: string;
}

const VimePlayer: React.FC<VimePlayerProps> = ({ videoId }) => {
  // The Vime player component will handle its own internal state.
  // We just need to ensure it re-renders if the videoId changes.
  useEffect(() => {
    // You can add any Vime specific event listeners or setup here if needed.
    // For basic playback, Vime handles most things declaratively.
  }, [videoId]);

  return (
    <Player controls>
      <Youtube videoId={videoId} />
      <DefaultUi />
    </Player>
  );
};

export default VimePlayer;
