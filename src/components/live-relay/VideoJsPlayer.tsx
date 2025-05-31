
"use client";

import React, { useEffect, useRef } from 'react';
import videojs from 'video.js';
import type { VideoJsPlayer as Player } from 'video.js'; // Import Player type
import 'video.js/dist/video-js.css';
// The following import is crucial for YouTube playback
import 'videojs-youtube'; // This registers the YouTube tech with Video.js

interface VideoJsPlayerProps {
  videoId: string;
}

const VideoJsPlayer: React.FC<VideoJsPlayerProps> = ({ videoId }) => {
  const videoNodeRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<Player | null>(null); // Use Player type

  useEffect(() => {
    // Make sure Video.js player is only initialized once
    if (videoNodeRef.current && !playerRef.current) {
      const videoElement = document.createElement('video-js');
      videoElement.classList.add('vjs-default-skin', 'vjs-big-play-centered', 'w-full', 'h-full');
      videoNodeRef.current.appendChild(videoElement);

      const videoJsOptions = {
        autoplay: true,
        controls: true, // Video.js controls
        responsive: true,
        fluid: true, // Player will have 100% width and calculate height according to aspect ratio
        techOrder: ['youtube'], // Important: prioritize YouTube tech
        sources: [{
          type: 'video/youtube',
          src: `https://www.youtube.com/watch?v=${videoId}`
        }],
        youtube: { // YouTube-specific options for the videojs-youtube plugin
          iv_load_policy: 3,    // Don't show video annotations
          modestbranding: 1,    // Show a subtle YouTube logo
          rel: 0,               // Do not show related videos when playback ends
          // controls: 0,       // To hide YouTube's own controls. Video.js controls will take over.
                                // If you want YT controls, set Video.js controls to false & this to 1 (or omit).
          // showinfo: 0,       // Deprecated by YouTube
          // fs: 0,             // To disable fullscreen button from YouTube (Video.js has its own)
        }
      };

      playerRef.current = videojs(videoElement, videoJsOptions, function onPlayerReady() {
        // console.log('Player is ready');
        // Example: this.play();
      });
    }

    // Dispose the player when the component unmounts or videoId changes
    return () => {
      if (playerRef.current && !playerRef.current.isDisposed()) {
        playerRef.current.dispose();
        playerRef.current = null;
        // Clean up the dynamically created video-js element
        if (videoNodeRef.current && videoNodeRef.current.firstChild) {
          videoNodeRef.current.removeChild(videoNodeRef.current.firstChild);
        }
      }
    };
  }, [videoId]); // Re-run effect if videoId changes

  return (
    // This div will contain the Video.js player
    // Ensure it takes up the aspect ratio defined by its parent
    <div data-vjs-player className="w-full h-full"> 
      <div ref={videoNodeRef} className="w-full h-full"></div>
    </div>
  );
};

export default VideoJsPlayer;
