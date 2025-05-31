
"use client";

import React, { useEffect, useRef } from 'react';
import { Player, Youtube, DefaultUi, usePlayerContext } from '@vime/react';

interface VimePlayerProps {
  videoId: string;
}

const VimePlayer: React.FC<VimePlayerProps> = ({ videoId }) => {
  const player = useRef<HTMLVmPlayerElement>(null);

  // Optional: Log Vime player events for debugging
  // useEffect(() => {
  //   if (!player.current) return;
  //   const p = player.current;
  //   const onPlay = () => console.log('VimePlayer: Play event');
  //   const onPause = () => console.log('VimePlayer: Pause event');
  //   const onError = (e: any) => console.error('VimePlayer: Error event', e.detail);

  //   p.addEventListener('vmPlay', onPlay);
  //   p.addEventListener('vmPause', onPause);
  //   p.addEventListener('vmError', onError);

  //   return () => {
  //     p.removeEventListener('vmPlay', onPlay);
  //     p.removeEventListener('vmPause', onPause);
  //     p.removeEventListener('vmError', onError);
  //   };
  // }, [player]);

  return (
    <Player ref={player} theme="dark" style={{ '--vm-player-theme': 'hsl(var(--primary))' } as any}>
      <Youtube videoId={videoId} />
      <DefaultUi />
    </Player>
  );
};

export default VimePlayer;
