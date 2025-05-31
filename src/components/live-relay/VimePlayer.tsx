
"use client";

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { VideoOff } from 'lucide-react';

interface VimePlayerPlaceholderProps {
  videoId?: string;
}

// Placeholder component
const VimePlayerPlaceholder: React.FC<VimePlayerPlaceholderProps> = ({ videoId }) => {
  return (
    <Alert variant="destructive" className="m-4 aspect-video flex flex-col items-center justify-center">
      <VideoOff className="h-8 w-8 mb-2" />
      <AlertTitle className="text-lg">Video Player Unavailable</AlertTitle>
      <AlertDescription className="text-center">
        The Vime.js player component could not be loaded.
        This is likely due to missing packages (<code>@vime/react</code>, <code>@vime/core</code>).
        Please resolve any <code>npm install</code> issues.
        {videoId && <p className="mt-1 text-xs">Attempted video ID: {videoId}</p>}
      </AlertDescription>
    </Alert>
  );
};

export default VimePlayerPlaceholder;
