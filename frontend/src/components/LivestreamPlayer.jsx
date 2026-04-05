import { useEffect, useRef } from "react";
import Hls from "hls.js";

// Default stream URL (used when no hlsUrl prop is provided)
const DEFAULT_STREAM = "http://147.185.221.229:47798/hls/yashc.m3u8";

const LivestreamPlayer = ({ hlsUrl }) => {
  const videoRef = useRef(null);
  const hlsRef   = useRef(null);

  const src = hlsUrl || DEFAULT_STREAM;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Destroy any existing HLS instance before re-initialising
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls();
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native HLS (Safari)
      video.src = src;
    }

    return () => {
      hlsRef.current?.destroy();
    };
  }, [src]);

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="relative w-full aspect-video bg-black border border-white/10 rounded-xl overflow-hidden">
        <video
          ref={videoRef}
          controls
          autoPlay
          playsInline
          className="w-full h-full"
        />
      </div>
    </div>
  );
};

export default LivestreamPlayer;
