// @ts-nocheck
"use client";
import React, { useRef, useState, useEffect, useMemo, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import Hls from "hls.js";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
// Google Maps will be loaded via window.google
declare global {
  interface Window {
    google: any;
  }
}
import { Progress } from "@/components/ui/progress";

import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  Settings,
  Loader2,
  Maximize,
  Minimize,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardFooter,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import {
  ChevronUp,
  ChevronDown,
  MapPin,
  Clock,
  Ruler,
  Crosshair,
} from "lucide-react";

// --- VideoSphere ---
const VideoSphere = ({ video }) => {
  const sphere = useRef();
  const texture = useMemo(() => new THREE.VideoTexture(video), [video]);

  useEffect(() => {
    return () => texture.dispose();
  }, [texture]);

  return (
    <mesh ref={sphere}>
      <sphereGeometry args={[500, 64, 64]} />
      <meshBasicMaterial side={THREE.BackSide} map={texture} />
    </mesh>
  );
};

const ProgressBar = ({ value, onChange, className = "", isVolume }) => {
  const progressRef = useRef(null);

  const handleClick = (e) => {
    if (!progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = (clickX / rect.width) * 100;
    onChange(isVolume ? percentage / 100 : percentage);
  };

  return (
    <div
      ref={progressRef}
      className={`relative ${
        isVolume ? "w-20" : "w-full"
      } h-2 bg-gray-700 rounded-full cursor-pointer ${className}`}
      onClick={handleClick}
    >
      <div
        className="absolute top-0 left-0 h-full bg-purple-500 rounded-full transition-all duration-150"
        style={{ width: `${isVolume ? value * 100 : value}%` }}
      />
      <div
        className="absolute top-1/2 transform -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md transition-all duration-150 hover:scale-125"
        style={{ left: `calc(${isVolume ? value * 100 : value}% - 6px)` }}
      />
    </div>
  );
};

// --- Custom Progress Bar Component ---
const VideoProgressBar = ({ value, onChange, className = "" }) => {
  const progressRef = useRef(null);

  const handleClick = (e) => {
    if (!progressRef.current) return;

    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = (clickX / rect.width) * 100;
    onChange(percentage);
  };

  return (
    <div
      ref={progressRef}
      className={`relative w-full h-2 bg-gray-600 rounded-full cursor-pointer ${className}`}
      onClick={handleClick}
    >
      <div
        className="absolute top-0 left-0 h-full bg-white rounded-full transition-all duration-150"
        style={{ width: `${value}%` }}
      />
      <div
        className="absolute top-1/2 transform -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md transition-all duration-150 hover:scale-110"
        style={{ left: `calc(${value}% - 6px)` }}
      />
    </div>
  );
};

// --- Volume Progress Bar Component ---
const VolumeProgressBar = ({ value, onChange, className = "" }) => {
  const progressRef = useRef(null);

  const handleClick = (e) => {
    if (!progressRef.current) return;

    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = (clickX / rect.width) * 100;
    onChange(percentage / 100); // Convert to 0-1 range
  };

  return (
    <div
      ref={progressRef}
      className={`relative w-20 h-2 bg-gray-600 rounded-full cursor-pointer ${className}`}
      onClick={handleClick}
    >
      <div
        className="absolute top-0 left-0 h-full bg-white rounded-full transition-all duration-150"
        style={{ width: `${value * 100}%` }}
      />
      <div
        className="absolute top-1/2 transform -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md transition-all duration-150 hover:scale-110"
        style={{ left: `calc(${value * 100}% - 6px)` }}
      />
    </div>
  );
};

// --- Video Player ---
const VideoPlayer = ({ url, video, setVideo, initialTimestamp = 1 }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [qualities, setQualities] = useState([]);
  const [selectedQuality, setSelectedQuality] = useState("Auto");
  const [isBuffering, setIsBuffering] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const containerRef = useRef(null);
  const hideControlsTimeoutRef = useRef(null);

  // Initialize video
  useEffect(() => {
    if (video) return;

    const videoEl = document.createElement("video");
    videoEl.crossOrigin = "anonymous";
    videoEl.playsInline = true;
    videoEl.volume = volume;
    videoEl.muted = false; // Ensure video starts unmuted

    if (Hls.isSupported()) {
      const hls = new Hls({ autoStartLoad: true });
      hls.loadSource(url);
      hls.attachMedia(videoEl);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        const levels = hls.levels.map((level, idx) => ({
          label: level.height + "p",
          index: idx,
        }));
        setQualities([{ label: "Auto", index: -1 }, ...levels]);
      });
      videoEl.hls = hls;
    } else {
      videoEl.src = url;
    }

    setVideo(videoEl);

    // Start playing when video is ready
    videoEl.addEventListener("loadedmetadata", () => {
      // Set initial timestamp if provided
      if (initialTimestamp > 0) {
        videoEl.currentTime = initialTimestamp;
      }
      // Auto-play when metadata is loaded
      videoEl.play().catch(console.warn);
    });

    return () => videoEl.remove();
  }, [url, video, setVideo]);

  const togglePlay = () => {
    if (!video) return;
    // Use the actual video element's paused state instead of React state
    if (video.paused) {
      video.play().catch(console.warn);
    } else {
      // Robust pause implementation
      video.pause();

      // If using HLS, also pause the HLS instance
      if (video.hls && typeof video.hls.stopLoad === "function") {
        video.hls.stopLoad();
        setTimeout(() => {
          if (video.hls && typeof video.hls.startLoad === "function") {
            video.hls.startLoad();
          }
        }, 100);
      }

      // Force ensure the video is actually paused
      setTimeout(() => {
        if (!video.paused) {
          console.warn(
            "Video still playing after pause command, forcing pause"
          );
          video.pause();
          // Also try setting currentTime to force a stop
          const currentTime = video.currentTime;
          video.currentTime = currentTime;
        }
      }, 50);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      // Enter fullscreen
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      } else if (containerRef.current.webkitRequestFullscreen) {
        containerRef.current.webkitRequestFullscreen();
      } else if (containerRef.current.mozRequestFullScreen) {
        containerRef.current.mozRequestFullScreen();
      } else if (containerRef.current.msRequestFullscreen) {
        containerRef.current.msRequestFullscreen();
      }
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  };

  // Add keyboard event listeners
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.code === "Space" && video) {
        e.preventDefault(); // Prevent page scroll
        togglePlay();
      } else if (e.code === "KeyF" && video) {
        e.preventDefault(); // Prevent browser's default fullscreen
        toggleFullscreen();
      } else if (e.code === "KeyK" && video) {
        e.preventDefault(); // K key also toggles play/pause (YouTube style)
        togglePlay();
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, [video, togglePlay, toggleFullscreen]);

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange
      );
      document.removeEventListener(
        "mozfullscreenchange",
        handleFullscreenChange
      );
      document.removeEventListener(
        "MSFullscreenChange",
        handleFullscreenChange
      );
    };
  }, []);

  // Handle mouse movement and show/hide controls
  const handleMouseMove = () => {
    setShowControls(true);

    // Clear existing timeout
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }

    // Set new timeout to hide controls after 3 seconds of inactivity
    hideControlsTimeoutRef.current = setTimeout(() => {
      if (!isPlaying) return; // Keep controls visible when paused
      setShowControls(false);
    }, 3000);
  };

  const handleMouseEnter = () => {
    setShowControls(true);
  };

  const handleMouseLeave = () => {
    if (!isPlaying) return; // Keep controls visible when paused
    setShowControls(false);
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }
  };

  // Show controls when video is paused
  useEffect(() => {
    if (!isPlaying) {
      setShowControls(true);
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
    }
  }, [isPlaying]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
    };
  }, []);

  const toggleMute = () => {
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleSeek = (percent) => {
    setProgress(percent);
    if (video?.duration) video.currentTime = (percent / 100) * video.duration;
  };

  const handleVolumeChange = (v) => {
    setVolume(v);
    if (video) video.volume = v;
    setIsMuted(v === 0);
  };

  useEffect(() => {
    if (!video) return;

    const updateTime = () => {
      setCurrentTime(video.currentTime);
      setDuration(video.duration || 0);
      setProgress(
        video.duration ? (video.currentTime / video.duration) * 100 : 0
      );
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setIsBuffering(false);
    };

    const handlePause = () => {
      setIsPlaying(false);
      // Double-check that video is actually paused
      if (!video.paused) {
        console.warn("Video pause event fired but video is still playing");
        video.pause();
      }
    };

    const handleWaiting = () => {
      setIsBuffering(true);
    };

    const handleCanPlay = () => {
      setIsBuffering(false);
    };

    video.addEventListener("timeupdate", updateTime);
    video.addEventListener("loadedmetadata", updateTime);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("canplaythrough", handleCanPlay);

    return () => {
      video.removeEventListener("timeupdate", updateTime);
      video.removeEventListener("loadedmetadata", updateTime);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("canplaythrough", handleCanPlay);
    };
  }, [video]);

  const formatTime = (t) => {
    if (!t) return "0:00";
    const minutes = Math.floor(t / 60);
    const seconds = Math.floor(t % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const VolumeIcon =
    isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: "#111",
        cursor: showControls ? "default" : "none",
      }}
    >
      <div onClick={togglePlay} style={{ width: "100%", height: "100%" }}>
        <Canvas camera={{ position: [0, 0, 0.1], fov: 75 }}>
          <OrbitControls enableZoom={false} enablePan={false} />
          <Suspense fallback={null}>
            {video && <VideoSphere video={video} />}
          </Suspense>
        </Canvas>
      </div>

      {/* <VRButton /> */}
      {isBuffering && (
        <div className="absolute inset-0 flex flex-col justify-center items-center bg-black/70 text-white z-50 gap-3">
          <Loader2 className="w-10 h-10 animate-spin" />
          <span>Buffering...</span>
        </div>
      )}

      {/* Controls */}
      <div
        className={`absolute bottom-3 left-0 w-full p-3 bg-black/60 backdrop-blur-sm flex flex-col gap-2 z-50 transition-all duration-300 ${
          showControls
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4 pointer-events-none"
        }`}
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={() => {
          setShowControls(true);
          if (hideControlsTimeoutRef.current) {
            clearTimeout(hideControlsTimeoutRef.current);
          }
        }}
        onMouseLeave={() => {
          if (isPlaying) {
            hideControlsTimeoutRef.current = setTimeout(() => {
              setShowControls(false);
            }, 1000); // Shorter timeout when leaving controls area
          }
        }}
      >
        <ProgressBar value={progress} onChange={handleSeek} />

        <div className="flex justify-between items-center text-white text-sm mt-2">
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="p-2 rounded-full hover:bg-white/20 transition"
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button
              onClick={toggleMute}
              className="p-2 rounded-full hover:bg-white/20 transition"
            >
              <VolumeIcon size={16} />
            </button>
            <ProgressBar
              value={volume}
              onChange={handleVolumeChange}
              isVolume
            />
            <span>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {qualities.length > 0 && (
              <select
                value={selectedQuality}
                onChange={(e) => {
                  const idx = qualities.findIndex(
                    (q) => q.label === e.target.value
                  );
                  if (video?.hls) video.hls.currentLevel = qualities[idx].index;
                  setSelectedQuality(e.target.value);
                }}
                className="bg-gray-900 text-white text-xs px-2 py-1 rounded border border-gray-600"
              >
                {qualities.map((q) => (
                  <option key={q.label} value={q.label}>
                    {q.label}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-full hover:bg-white/20 transition"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
// --- Map Component ---
const SimpleMap = ({
  data,
  video,
}: {
  data: any[];
  video: HTMLVideoElement | null;
}) => {
  // Check if we're on the client side
  if (typeof window === "undefined") {
    return <div>Loading map...</div>;
  }

  // Check if Google Maps is available
  if (!window.google) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f0f0f0",
          padding: "20px",
          textAlign: "center",
        }}
      >
        <div
          style={{ marginBottom: "10px", fontSize: "16px", fontWeight: "500" }}
        >
          Google Maps not loaded
        </div>
        <div style={{ fontSize: "14px", color: "#666", maxWidth: "400px" }}>
          Please add your Google Maps API key to the environment variables.
          <br />
          <br />
          1. Get an API key from Google Cloud Console
          <br />
          2. Enable Maps JavaScript API and Geometry Library
          <br />
          3. Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env.local file
        </div>
      </div>
    );
  }

  // Show loading state if no data
  if (!data || data.length === 0) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f0f0f0",
        }}
      >
        <div>No GPS data available</div>
      </div>
    );
  }

  const mapRef = useRef<HTMLDivElement>(null);
  const movingMarkerRef = useRef<any>(null);
  const startMarkerRef = useRef<any>(null);
  const endMarkerRef = useRef<any>(null);
  const coveredPolylineRef = useRef<any>(null);
  const remainingPolylineRef = useRef<any>(null);
  const shadowPolylineRef = useRef<any>(null);
  const [map, setMap] = useState<any>(null);
  const [coords, setCoords] = useState({ lat: 0, lng: 0 });
  const [distance, setDistance] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [timestamp, setTimestamp] = useState(0);
  const [hoverInfo, setHoverInfo] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const calcDistance = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ) => {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371e3;
    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1);
    const Δλ = toRad(lng2 - lng1);
    const a =
      Math.sin(Δφ / 2) ** 2 +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Smooth GPS points for polyline
  const getSmoothedPath = (points: any[], windowSize = 3) => {
    return points.map((point, idx, arr) => {
      const start = Math.max(0, idx - Math.floor(windowSize / 2));
      const end = Math.min(arr.length, idx + Math.floor(windowSize / 2));
      const slice = arr.slice(start, end);
      const lat =
        slice.reduce((sum, p) => sum + parseFloat(p.Latitude), 0) /
        slice.length;
      const lng =
        slice.reduce((sum, p) => sum + parseFloat(p.Longitude), 0) /
        slice.length;
      return new window.google.maps.LatLng(lat, lng);
    });
  };

  // Initialize map and markers
  useEffect(() => {
    if (
      !mapRef.current ||
      map ||
      !data?.length ||
      typeof window === "undefined" ||
      !window.google
    )
      return;

    const firstPoint = data[0];
    const lastPoint = data[data.length - 1];

    // Add a small delay to ensure the container is properly rendered
    const timer = setTimeout(() => {
      if (!mapRef.current) return;

      // Create Google Map
      const googleMap = new window.google.maps.Map(mapRef.current, {
        zoom: 18,
        center: {
          lat: parseFloat(firstPoint.Latitude),
          lng: parseFloat(firstPoint.Longitude),
        },
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        zoomControl: true,
        zoomControlOptions: {
          position: window.google.maps.ControlPosition.BOTTOM_RIGHT,
        },
        mapTypeControl: true,
        mapTypeControlOptions: {
          style: window.google.maps.MapTypeControlStyle.DROPDOWN_MENU,
          position: window.google.maps.ControlPosition.TOP_RIGHT,
        },
        streetViewControl: false,
        fullscreenControl: false,
      });

      setMap(googleMap);

      // Create start marker with custom HTML
      const startMarker = new window.google.maps.Marker({
        position: {
          lat: parseFloat(firstPoint.Latitude),
          lng: parseFloat(firstPoint.Longitude),
        },
        map: googleMap,
        title: "Start Point",
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="startGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:#10B981;stop-opacity:1" />
                  <stop offset="100%" style="stop-color:#059669;stop-opacity:1" />
                </linearGradient>
                <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#10B981" flood-opacity="0.4"/>
                </filter>
              </defs>
              <circle cx="16" cy="16" r="12" fill="url(#startGrad)" stroke="white" stroke-width="4" filter="url(#shadow)"/>
              <text x="16" y="20" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="14" font-weight="bold">S</text>
            </svg>
          `)}`,
          scaledSize: new window.google.maps.Size(32, 32),
          anchor: new window.google.maps.Point(16, 16),
        },
      });

      startMarkerRef.current = startMarker;

      // Create start label
      const startInfoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="
            background: rgba(16, 185, 129, 0.9);
            color: white;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
            white-space: nowrap;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            border: 1px solid rgba(255,255,255,0.3);
            text-align: center;
          ">START</div>
        `,
        disableAutoPan: true,
      });
      startInfoWindow.open(googleMap, startMarker);

      // Create end marker with custom HTML
      const endMarker = new window.google.maps.Marker({
        position: {
          lat: parseFloat(lastPoint.Latitude),
          lng: parseFloat(lastPoint.Longitude),
        },
        map: googleMap,
        title: "End Point",
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="endGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:#EF4444;stop-opacity:1" />
                  <stop offset="100%" style="stop-color:#DC2626;stop-opacity:1" />
                </linearGradient>
                <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#EF4444" flood-opacity="0.4"/>
                </filter>
              </defs>
              <circle cx="16" cy="16" r="12" fill="url(#endGrad)" stroke="white" stroke-width="4" filter="url(#shadow)"/>
              <text x="16" y="20" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="14" font-weight="bold">E</text>
            </svg>
          `)}`,
          scaledSize: new window.google.maps.Size(32, 32),
          anchor: new window.google.maps.Point(16, 16),
        },
      });

      endMarkerRef.current = endMarker;

      // Create end label
      const endInfoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="
            background: rgba(239, 68, 68, 0.9);
            color: white;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
            white-space: nowrap;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            border: 1px solid rgba(255,255,255,0.3);
            text-align: center;
          ">END</div>
        `,
        disableAutoPan: true,
      });
      endInfoWindow.open(googleMap, endMarker);

      // Create moving marker as a blue circle
      const movingMarker = new window.google.maps.Marker({
        position: {
          lat: parseFloat(firstPoint.Latitude),
          lng: parseFloat(firstPoint.Longitude),
        },
        map: googleMap,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
              <circle cx="8" cy="8" r="6" fill="#3B82F6" stroke="#3B82F6" stroke-width="2" fill-opacity="0.9"/>
            </svg>
          `)}`,
          scaledSize: new window.google.maps.Size(16, 16),
          anchor: new window.google.maps.Point(8, 8),
        },
      });

      movingMarkerRef.current = movingMarker;

      // Create covered and remaining route polylines
      const smoothedPath = getSmoothedPath(data);

      // Add shadow polyline
      const shadowPolyline = new window.google.maps.Polyline({
        path: smoothedPath,
        geodesic: true,
        strokeColor: "#1F2937",
        strokeOpacity: 0.3,
        strokeWeight: 8,
        map: googleMap,
        clickable: false,
      });

      shadowPolylineRef.current = shadowPolyline;

      // Create covered route polyline (initially empty)
      const coveredPolyline = new window.google.maps.Polyline({
        path: [],
        geodesic: true,
        strokeColor: "#10B981", // Green color for covered route
        strokeOpacity: 0.9,
        strokeWeight: 6,
        map: googleMap,
        clickable: true, // Make it clickable for backward navigation
      });

      coveredPolylineRef.current = coveredPolyline;

      // Create remaining route polyline (initially full route)
      const remainingPolyline = new window.google.maps.Polyline({
        path: smoothedPath,
        geodesic: true,
        strokeColor: "#8B5CF6", // Purple color for remaining route
        strokeOpacity: 0.9,
        strokeWeight: 6,
        map: googleMap,
        clickable: true,
        icons: [
          {
            icon: {
              path: "M 0,-1 0,1",
              strokeOpacity: 1,
              scale: 4,
            },
            offset: "0",
            repeat: "20px",
          },
        ],
      });

      remainingPolylineRef.current = remainingPolyline;

      // Store references for updating
      movingMarker.fullPath = smoothedPath;

      // Create a reusable click handler function
      const handleRouteClick = (event) => {
        const clickedLatLng = event.latLng;

        // Find the closest GPS point to the clicked location
        let closestPoint = data[0];
        let minDistance = Infinity;

        data.forEach((point) => {
          const pointLatLng = new window.google.maps.LatLng(
            parseFloat(point.Latitude),
            parseFloat(point.Longitude)
          );
          const distance =
            window.google.maps.geometry.spherical.computeDistanceBetween(
              clickedLatLng,
              pointLatLng
            );

          if (distance < minDistance) {
            minDistance = distance;
            closestPoint = point;
          }
        });

        // Jump to the timestamp of the closest point
        if (video && closestPoint) {
          let timestamp = null;

          if (closestPoint.timeStamp !== undefined) {
            timestamp = parseFloat(closestPoint.timeStamp);
          }

          if (timestamp !== null && !isNaN(timestamp)) {
            video.currentTime = timestamp;
          } else {
            console.error(
              "No valid timestamp found in closest point:",
              closestPoint
            );
          }
        }
      };

      // Store map reference for mouse events
      mapRef.current.addEventListener("mousemove", (e) => {
        const rect = mapRef.current.getBoundingClientRect();
        setMousePosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      });

      // Create hover handler function
      const handleRouteHover = (event) => {
        const clickedLatLng = event.latLng;

        // Find the closest GPS point to the hovered location
        let closestPoint = data[0];
        let minDistance = Infinity;

        data.forEach((point) => {
          const pointLatLng = new window.google.maps.LatLng(
            parseFloat(point.Latitude),
            parseFloat(point.Longitude)
          );
          const distance =
            window.google.maps.geometry.spherical.computeDistanceBetween(
              clickedLatLng,
              pointLatLng
            );

          if (distance < minDistance) {
            minDistance = distance;
            closestPoint = point;
          }
        });

        if (closestPoint && closestPoint.timeStamp !== undefined) {
          const timestamp = parseFloat(closestPoint.timeStamp);
          const lat = parseFloat(closestPoint.Latitude).toFixed(6);
          const lng = parseFloat(closestPoint.Longitude).toFixed(6);

          // Format time
          const formatTime = (t) => {
            if (!t) return "0:00";
            const minutes = Math.floor(t / 60);
            const seconds = Math.floor(t % 60);
            return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
          };

          setHoverInfo({
            timestamp: formatTime(timestamp),
            lat,
            lng,
          });
        }
      };

      // Handle mouse leave to close tooltip
      const handleRouteMouseOut = () => {
        setHoverInfo(null);
      };

      // Add hover handlers to both polylines
      coveredPolyline.addListener("mouseover", handleRouteHover);
      coveredPolyline.addListener("mouseout", handleRouteMouseOut);
      remainingPolyline.addListener("mouseover", handleRouteHover);
      remainingPolyline.addListener("mouseout", handleRouteMouseOut);

      // Add click handler to both covered and remaining polylines
      coveredPolyline.addListener("click", handleRouteClick);
      remainingPolyline.addListener("click", handleRouteClick);

      // Fit map to show the whole route
      const bounds = new window.google.maps.LatLngBounds();
      smoothedPath.forEach((point) => bounds.extend(point));
      googleMap.fitBounds(bounds);
    }, 100);

    return () => {
      clearTimeout(timer);
      // Google Maps cleanup is handled automatically
    };
  }, [mapRef, map, data]);

  // Smooth marker movement with requestAnimationFrame
  useEffect(() => {
    if (!video || !map || !data?.length || typeof window === "undefined")
      return;

    let animationId: number;

    const updateMarker = () => {
      const t = video.currentTime;
      setTimestamp(t);

      // Find two surrounding points
      let prev = data[0];
      let next = data[data.length - 1];
      for (let i = 0; i < data.length - 1; i++) {
        if (
          parseFloat(data[i].timeStamp) <= t &&
          t <= parseFloat(data[i + 1].timeStamp)
        ) {
          prev = data[i];
          next = data[i + 1];
          break;
        }
      }

      const ratio =
        (t - parseFloat(prev.timeStamp)) /
        (parseFloat(next.timeStamp) - parseFloat(prev.timeStamp));

      const lat =
        parseFloat(prev.Latitude) +
        ratio * (parseFloat(next.Latitude) - parseFloat(prev.Latitude));
      const lng =
        parseFloat(prev.Longitude) +
        ratio * (parseFloat(next.Longitude) - parseFloat(prev.Longitude));

      const pos = new window.google.maps.LatLng(lat, lng);
      movingMarkerRef.current?.setPosition(pos);

      setCoords({ lat: lat.toFixed(6), lng: lng.toFixed(6) });

      const accuracyValue = prev.Accuracy ? parseFloat(prev.Accuracy) : 0;
      setAccuracy((accuracyValue * 100).toFixed(2));

      const dist = calcDistance(
        parseFloat(data[0].Latitude),
        parseFloat(data[0].Longitude),
        lat,
        lng
      );
      setDistance(dist.toFixed(1));

      // Update covered and remaining route polylines
      if (
        movingMarkerRef.current?.fullPath &&
        coveredPolylineRef.current &&
        remainingPolylineRef.current
      ) {
        const fullPath = movingMarkerRef.current.fullPath;
        const currentIndex = Math.floor(
          (t / parseFloat(data[data.length - 1].timeStamp)) * fullPath.length
        );

        // Split the path into covered and remaining parts
        const coveredPath = fullPath.slice(0, currentIndex + 1);
        const remainingPath = fullPath.slice(currentIndex);

        // Update the polylines
        coveredPolylineRef.current.setPath(coveredPath);
        remainingPolylineRef.current.setPath(remainingPath);
      }

      // Continue animation if video is playing
      if (!video.paused) {
        animationId = requestAnimationFrame(updateMarker);
      }
    };

    // Start animation loop
    animationId = requestAnimationFrame(updateMarker);

    // Handle video events
    const handlePlay = () => {
      animationId = requestAnimationFrame(updateMarker);
    };

    const handlePause = () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };

    const handleSeek = () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      updateMarker();
      if (!video.paused) {
        animationId = requestAnimationFrame(updateMarker);
      }
    };

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("seeked", handleSeek);
    video.addEventListener("loadedmetadata", updateMarker);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("seeked", handleSeek);
      video.removeEventListener("loadedmetadata", updateMarker);
    };
  }, [video, map, data]);

  const formatTime = (t: number) => {
    if (!t) return "0:00";
    const min = Math.floor(t / 60);
    const sec = Math.floor(t % 60);
    return `${min}:${sec < 10 ? "0" : ""}${sec}`;
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <Card className="z-[9999] w-[230px] absolute top-2 left-2 shadow-lg rounded-2xl border border-neutral-200 bg-white/70 backdrop-blur-md">
        <CardContent className="pl-2 pr-2 pt-0 pb-0 text-sm text-neutral-700">
          {/* Time */}
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-neutral-500" />
            <span className="truncate">{formatTime(timestamp)}</span>
          </div>

          {/* Lat / Lng */}
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-red-500" />
            <span className="truncate">
              {coords.lat}, {coords.lng}
            </span>
          </div>

          {/* Distance */}
          <div className="flex items-center gap-2">
            <Ruler className="h-4 w-4 text-blue-500" />
            <span>{distance} m</span>
          </div>

          {/* Accuracy */}
          <div className="flex items-center gap-2">
            <Crosshair className="h-4 w-4 text-green-500" />
            <span>{accuracy} m</span>
          </div>
        </CardContent>
      </Card>

      {/* Custom Hover Tooltip */}
      {hoverInfo && (
        <div
          className="absolute z-[10000] pointer-events-none"
          style={{
            left: mousePosition.x + 10,
            top: mousePosition.y - 10,
            transform: "translate(0, -100%)",
          }}
        >
          <TooltipProvider>
            <div className="bg-popover text-popover-foreground rounded-md border px-3 py-2 text-sm shadow-md animate-in fade-in-0 zoom-in-95">
              <div className="font-semibold text-foreground mb-2 pb-1 border-b">
                Route Info
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-muted-foreground">Time:</span>
                  <span className="text-xs font-semibold text-green-600">
                    {hoverInfo.timestamp}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-3 w-3 text-red-500" />
                  <span className="text-xs text-muted-foreground">Lat:</span>
                  <span className="text-xs font-mono text-red-600">
                    {hoverInfo.lat}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-3 w-3 text-red-500" />
                  <span className="text-xs text-muted-foreground">Lng:</span>
                  <span className="text-xs font-mono text-red-600">
                    {hoverInfo.lng}
                  </span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground text-center mt-2 pt-1 border-t">
                Click to seek to this point
              </div>
            </div>
          </TooltipProvider>
        </div>
      )}

      <div
        ref={mapRef}
        style={{
          width: "100%",
          height: "100%",
          minHeight: "400px",
          backgroundColor: "#f0f0f0",
        }}
      />
    </div>
  );
};

// --- Main Component ---
export default function VideoWithMap({
  videoUrl,
  locationData,
  initialX,
  initialY,
}) {
  const [video, setVideo] = useState(null);
  const sortedData = useMemo(
    () => locationData?.sort((a, b) => a.timestamp - b.timestamp) || [],
    [locationData]
  );

  // Find the closest GPS point to initial coordinates if provided
  let initialTimestamp = 0;
  if (initialX !== undefined && initialY !== undefined && sortedData?.length) {
    let closestPoint = sortedData[0];
    let minDistance = Infinity;

    sortedData.forEach((point) => {
      const pointLatLng = new window.google.maps.LatLng(
        parseFloat(point.Latitude),
        parseFloat(point.Longitude)
      );
      const initialLatLng = new window.google.maps.LatLng(initialY, initialX); // Note: Y is lat, X is lng
      const distance =
        window.google.maps.geometry.spherical.computeDistanceBetween(
          initialLatLng,
          pointLatLng
        );

      if (distance < minDistance) {
        minDistance = distance;
        closestPoint = point;
      }
    });

    initialTimestamp = closestPoint?.timeStamp
      ? parseFloat(closestPoint.timeStamp)
      : 0;
  }

  return (
    <PanelGroup
      direction="horizontal"
      style={{ width: "100%", height: "80vh" }}
    >
      <Panel defaultSize={50} minSize={30}>
        <div className="w-full h-full rounded-xl overflow-hidden shadow-lg border border-gray-300">
          <VideoPlayer
            url={videoUrl}
            video={video}
            setVideo={setVideo}
            initialTimestamp={initialTimestamp}
          />
        </div>
      </Panel>
      <PanelResizeHandle className="w-2 cursor-col-resize bg-gray-200 hover:bg-gray-400 transition" />
      <Panel defaultSize={50} minSize={30}>
        <div className="w-full h-full rounded-xl overflow-hidden shadow-lg border border-gray-300">
          {video && <SimpleMap data={sortedData} video={video} />}
        </div>
      </Panel>
    </PanelGroup>
  );
}
