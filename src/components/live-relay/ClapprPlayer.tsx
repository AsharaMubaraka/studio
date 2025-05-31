
"use client";

import React, { useEffect, useRef } from 'react';
import Clappr from 'clappr';
// @ts-ignore
import YoutubePlayback from 'clappr-youtube-playback'; 

interface ClapprPlayerProps {
  videoId: string;
}

const ClapprPlayer: React.FC<ClapprPlayerProps> = ({ videoId }) => {
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<Clappr.Player | null>(null);

  // Generate a unique ID for the player container to avoid conflicts if multiple players are on a page
  const containerId = `clappr-player-${React.useId().replace(/:/g, "")}`;

  useEffect(() => {
    if (playerContainerRef.current && videoId) {
      // Destroy previous instance if it exists to prevent memory leaks or multiple players
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }

      const clapprOptions: Clappr.PlayerOptions = {
        source: `https://www.youtube.com/watch?v=${videoId}`,
        parentId: `#${containerId}`, // Use the dynamically generated ID
        plugins: [YoutubePlayback],
        width: '100%',
        height: '100%',
        autoPlay: true,
        // Clappr's YouTube Playback plugin options
        // Consult the clappr-youtube-playback plugin documentation for available options.
        // Common options might include:
        youtubeShowRelatedVideos: false, // Attempt to hide related videos
        youtubeNoCookie: true, // Use youtube-nocookie.com domain
        youtubeDisableKeyboard: false, // Enable/disable keyboard controls for YT player
        youtubeHideControls: true, // Try to hide YouTube's own controls; Clappr controls will be used
        youtubeShowInfo: false, // Try to hide video title and uploader info
        youtubeModestBranding: true, // Try for a less prominent YouTube logo
        
        // General Clappr player options
        // poster: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`, // Optional: Set a poster image
        // mute: false,
        // loop: false,
        // hideMediaControl: false, // Set to false to show Clappr's default controls
      };
      
      playerRef.current = new Clappr.Player(clapprOptions);
    }

    // Cleanup function to destroy the player when the component unmounts or videoId changes
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [videoId, containerId]); // Add containerId to dependencies

  return (
    <div id={containerId} ref={playerContainerRef} className="w-full h-full bg-black">
      {/* Clappr player will attach here */}
    </div>
  );
};

export default ClapprPlayer;
