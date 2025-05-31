
"use client";

import React, { useEffect, useRef, useState } from 'react';
import Clappr from 'clappr';
// @ts-ignore 
import YoutubePlayback from 'clappr-youtube-playback';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { VideoOff } from 'lucide-react';

interface ClapprPlayerProps {
  videoId: string;
}

const ClapprPlayer: React.FC<ClapprPlayerProps> = ({ videoId }) => {
  const playerRef = useRef<HTMLDivElement>(null);
  const clapprPlayerInstanceRef = useRef<Clappr.Player | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (playerRef.current && !playerRef.current.id) {
      playerRef.current.id = `clappr-player-${Math.random().toString(36).substring(7)}`;
    }

    if (playerRef.current && playerRef.current.id && videoId) {
      setError(null); 
      try {
        if (clapprPlayerInstanceRef.current) {
          clapprPlayerInstanceRef.current.destroy();
          clapprPlayerInstanceRef.current = null;
        }

        clapprPlayerInstanceRef.current = new Clappr.Player({
          source: `https://www.youtube.com/watch?v=${videoId}`,
          parentId: `#${playerRef.current.id}`,
          plugins: [YoutubePlayback],
          youtubePlayback: {
            // Optional YouTube Player API parameters
            // e.g., autoplay: 1, controls: 0, showinfo: 0 
          },
          width: '100%',
          height: '100%',
          autoPlay: true,
        });

        clapprPlayerInstanceRef.current.on(Clappr.Events.PLAYER_ERROR, (errEvent: any) => {
          console.error("Clappr Player Error:", errEvent);
          let message = 'Unknown video playback error.';
          if (errEvent && errEvent.data && errEvent.data.message) {
            message = errEvent.data.message;
          } else if (errEvent && errEvent.message) {
            message = errEvent.message;
          } else if (typeof errEvent === 'string') {
            message = errEvent;
          }
          setError(`Video playback error: ${message}. This might be due to video restrictions or network issues.`);
        });

      } catch (e: any) {
        console.error("Error initializing Clappr Player:", e);
        setError(`Failed to initialize video player: ${e.message || 'Unknown error'}`);
      }

      return () => {
        if (clapprPlayerInstanceRef.current) {
          clapprPlayerInstanceRef.current.destroy();
          clapprPlayerInstanceRef.current = null;
        }
      };
    }
  }, [videoId]);

  if (error) {
    return (
      <Alert variant="destructive" className="m-4 aspect-video flex flex-col items-center justify-center">
        <VideoOff className="h-8 w-8 mb-2" />
        <AlertTitle className="text-lg">Video Player Error</AlertTitle>
        <AlertDescription className="text-center">
          {error}
        </AlertDescription>
      </Alert>
    );
  }

  return <div id={playerRef.current?.id || "clappr-player-container"} ref={playerRef} className="w-full h-full bg-black" />;
};

export default ClapprPlayer;
