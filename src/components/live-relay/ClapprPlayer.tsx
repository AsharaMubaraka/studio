
"use client";

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { VideoOff } from 'lucide-react';

interface ClapprPlayerProps {
  videoId: string;
}

const ClapprPlayer: React.FC<ClapprPlayerProps> = ({ videoId }) => {
  return (
    <Alert variant="destructive" className="m-4 aspect-video flex flex-col items-center justify-center bg-muted/30">
      <VideoOff className="h-10 w-10 mb-3 text-muted-foreground" />
      <AlertTitle className="text-lg font-semibold">Video Player Unavailable</AlertTitle>
      <AlertDescription className="text-center text-muted-foreground">
        The Clappr player component could not be loaded. This is likely due to missing packages (clappr, clappr-youtube-playback).
        Please resolve any npm install issues.
        <br />
        Attempted video ID: {videoId}
      </AlertDescription>
    </Alert>
  );
};

export default ClapprPlayer;
