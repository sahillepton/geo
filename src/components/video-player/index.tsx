// @ts-nocheck
"use client";
import React, { useRef, useState, useEffect, useMemo, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import Hls from "hls.js";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Progress } from "@/components/ui/progress";

import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  Settings,
  Loader2,
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

  // Initialize video
  useEffect(() => {
    if (video) return;

    const videoEl = document.createElement("video");
    videoEl.crossOrigin = "anonymous";
    //videoEl.playsInline = true;
    videoEl.volume = volume;
    videoEl.muted = isMuted;

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
    });

    videoEl.addEventListener("canplay", () => {
      if (!videoEl.paused) return; // Don't restart if already playing
      videoEl.play().catch(console.warn);
    });

    return () => videoEl.remove();
  }, [url, video, setVideo]);

  const togglePlay = () => {
    if (!video) return;
    if (isPlaying) video.pause();
    else video.play().catch(console.warn);
    setIsPlaying(!isPlaying);
  };

  // Add keyboard event listener for spacebar
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.code === "Space" && video) {
        e.preventDefault(); // Prevent page scroll
        togglePlay();
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, [video, isPlaying]);

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
    video.addEventListener("timeupdate", updateTime);
    video.addEventListener("loadedmetadata", updateTime);
    video.addEventListener("waiting", () => setIsBuffering(true));
    video.addEventListener("canplay", () => setIsBuffering(false));
    video.addEventListener("canplaythrough", () => setIsBuffering(false));
    return () => {
      video.removeEventListener("timeupdate", updateTime);
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
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: "#111",
      }}
    >
      <Canvas camera={{ position: [0, 0, 0.1], fov: 75 }}>
        <OrbitControls enableZoom={false} enablePan={false} />
        <Suspense fallback={null}>
          {video && <VideoSphere video={video} />}
        </Suspense>
      </Canvas>

      {isBuffering && (
        <div className="absolute inset-0 flex flex-col justify-center items-center bg-black/70 text-white z-50 gap-3">
          <Loader2 className="w-10 h-10 animate-spin" />
          <span>Buffering...</span>
        </div>
      )}

      {/* Controls */}
      <div
        className="absolute bottom-3 left-0 w-full p-3 bg-black/60 backdrop-blur-sm flex flex-col gap-2 z-50"
        onClick={(e) => e.stopPropagation()}
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
  const movingMarkerRef = useRef<L.Marker | null>(null);
  const startMarkerRef = useRef<L.Marker | null>(null);
  const endMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const [coords, setCoords] = useState({ lat: 0, lng: 0 });
  const [distance, setDistance] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [timestamp, setTimestamp] = useState(0);

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
      return { lat, lng };
    });
  };

  // Initialize map and markers
  useEffect(() => {
    if (
      !mapRef.current ||
      map ||
      !data?.length ||
      typeof window === "undefined"
    )
      return;

    //   console.log("Initializing map with data:", data.length, "points");

    const firstPoint = data[0];
    const lastPoint = data[data.length - 1];

    // console.log("First point:", firstPoint);
    //console.log("Last point:", lastPoint);

    // Add a small delay to ensure the container is properly rendered
    const timer = setTimeout(() => {
      if (!mapRef.current) return;

      // Create Leaflet map
      const leafletMap = L.map(mapRef.current, {
        zoom: 18,
        center: [
          parseFloat(firstPoint.Latitude),
          parseFloat(firstPoint.Longitude),
        ],
        dragging: true,
        zoomControl: false, // We'll add it manually to control position
      });

      //  console.log("Map created:", leafletMap);

      // Add OpenStreetMap as default
      const openStreetMap = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          attribution: "© OpenStreetMap contributors",
          maxZoom: 19,
        }
      );

      // Add Google Maps tile layers as alternatives
      const googleStreets = L.tileLayer(
        "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
        {
          attribution: "© Google Maps",
          maxZoom: 20,
        }
      );

      const googleSatellite = L.tileLayer(
        "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
        {
          attribution: "© Google Maps",
          maxZoom: 20,
        }
      );

      const googleHybrid = L.tileLayer(
        "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
        {
          attribution: "© Google Maps",
          maxZoom: 20,
        }
      );

      const googleTerrain = L.tileLayer(
        "https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}",
        {
          attribution: "© Google Maps",
          maxZoom: 20,
        }
      );

      // Add default OpenStreetMap layer
      openStreetMap.addTo(leafletMap);

      // Layer control
      const baseMaps = {
        OpenStreetMap: openStreetMap,
        "Google Streets": googleStreets,
        "Google Satellite": googleSatellite,
        "Google Hybrid": googleHybrid,
        "Google Terrain": googleTerrain,
      };

      L.control.layers(baseMaps).addTo(leafletMap);

      setMap(leafletMap);

      // Create start marker with custom icon and label
      const startIcon = L.divIcon({
        className: "custom-marker start-marker",
        html: `
          <div style="
            width: 32px; 
            height: 32px; 
            background: linear-gradient(135deg, #10B981, #059669);
            border: 4px solid #ffffff;
            border-radius: 50%;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 14px;
            position: relative;
          ">S</div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      startMarkerRef.current = L.marker(
        [parseFloat(firstPoint.Latitude), parseFloat(firstPoint.Longitude)],
        {
          icon: startIcon,
          title: "Start Point",
        }
      ).addTo(leafletMap);

      // Add start point label
      L.marker(
        [parseFloat(firstPoint.Latitude), parseFloat(firstPoint.Longitude)],
        {
          icon: L.divIcon({
            className: "marker-label",
            html: `
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
            ">START</div>
          `,
            iconSize: [60, 20],
            iconAnchor: [30, 25],
          }),
        }
      ).addTo(leafletMap);

      // Create end marker with custom icon and label
      const endIcon = L.divIcon({
        className: "custom-marker end-marker",
        html: `
          <div style="
            width: 32px; 
            height: 32px; 
            background: linear-gradient(135deg, #EF4444, #DC2626);
            border: 4px solid #ffffff;
            border-radius: 50%;
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 14px;
            position: relative;
          ">E</div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      endMarkerRef.current = L.marker(
        [parseFloat(lastPoint.Latitude), parseFloat(lastPoint.Longitude)],
        {
          icon: endIcon,
          title: "End Point",
        }
      ).addTo(leafletMap);

      // Add end point label
      L.marker(
        [parseFloat(lastPoint.Latitude), parseFloat(lastPoint.Longitude)],
        {
          icon: L.divIcon({
            className: "marker-label",
            html: `
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
            ">END</div>
          `,
            iconSize: [50, 20],
            iconAnchor: [25, 25],
          }),
        }
      ).addTo(leafletMap);

      // Create moving marker as a blue circle with shadow and pulse effect
      movingMarkerRef.current = L.circle(
        [parseFloat(firstPoint.Latitude), parseFloat(firstPoint.Longitude)],
        {
          radius: 2,
          color: "#3B82F6",
          fillColor: "#3B82F6",
          fillOpacity: 0.9,
          weight: 2,
        }
      ).addTo(leafletMap);

      // Add zoom control at bottom right
      L.control
        .zoom({
          position: "bottomright",
        })
        .addTo(leafletMap);

      // Create covered and remaining route polylines
      const smoothedPath = getSmoothedPath(data);

      // Initially, all route is remaining (covered route is empty)
      const coveredPath = [];
      const remainingPath = smoothedPath;

      // Create covered route polyline (initially empty)
      const coveredPolyline = L.polyline(coveredPath, {
        color: "#10B981", // Green color for covered route
        weight: 6,
        opacity: 0.9,
        lineCap: "round",
        lineJoin: "round",
        interactive: false,
      }).addTo(leafletMap);

      // Create remaining route polyline (initially full route)
      polylineRef.current = L.polyline(remainingPath, {
        color: "#8B5CF6", // Purple color for remaining route
        weight: 6,
        opacity: 0.9,
        lineCap: "round",
        lineJoin: "round",
        dashArray: "10, 5", // Dashed line effect
        dashOffset: "0",
        interactive: true, // Make sure it's interactive
        className: "clickable-polyline", // Add a class for styling
      }).addTo(leafletMap);

      // Store references for updating
      movingMarkerRef.current.coveredPolyline = coveredPolyline;
      movingMarkerRef.current.remainingPolyline = polylineRef.current;
      movingMarkerRef.current.fullPath = smoothedPath;

      //  console.log("Polyline created:", polylineRef.current);

      // Add click handler immediately when polyline is created
      polylineRef.current.on("click", (e) => {
        //  console.log("Polyline clicked immediately!");
        const clickedLatLng = e.latlng;
        //  console.log("Clicked LatLng:", clickedLatLng);

        // Find the closest GPS point to the clicked location
        let closestPoint = data[0];
        let minDistance = Infinity;

        data.forEach((point) => {
          const pointLatLng = L.latLng(
            parseFloat(point.Latitude),
            parseFloat(point.Longitude)
          );
          const distance = clickedLatLng.distanceTo(pointLatLng);

          if (distance < minDistance) {
            minDistance = distance;
            closestPoint = point;
          }
        });

        //  console.log("Closest point:", closestPoint);

        // Jump to the timestamp of the closest point
        if (video && closestPoint) {
          let timestamp = null;

          if (closestPoint.timeStamp !== undefined) {
            timestamp = parseFloat(closestPoint.timeStamp);
          }

          if (timestamp !== null && !isNaN(timestamp)) {
            //  console.log("Setting video time to:", timestamp);
            video.currentTime = timestamp;
          } else {
            console.error(
              "No valid timestamp found in closest point:",
              closestPoint
            );
          }
        } else {
          //  console.log("Video or closestPoint not available");
        }
      });

      // Add a shadow effect with a thicker, semi-transparent line behind
      L.polyline(smoothedPath, {
        color: "#1F2937",
        weight: 8,
        opacity: 0.3,
        lineCap: "round",
        lineJoin: "round",
        interactive: false,
      }).addTo(leafletMap);

      // Fit map to show the whole route
      const bounds = L.latLngBounds(smoothedPath);
      leafletMap.fitBounds(bounds);
    }, 100);

    return () => {
      clearTimeout(timer);
      if (map) {
        map.remove();
      }
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

      const pos = L.latLng(lat, lng);
      movingMarkerRef.current?.setLatLng(pos);

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
        movingMarkerRef.current?.coveredPolyline &&
        movingMarkerRef.current?.remainingPolyline
      ) {
        const fullPath = movingMarkerRef.current.fullPath;
        const currentIndex = Math.floor(
          (t / parseFloat(data[data.length - 1].timeStamp)) * fullPath.length
        );

        // Split the path into covered and remaining parts
        const coveredPath = fullPath.slice(0, currentIndex + 1);
        const remainingPath = fullPath.slice(currentIndex);

        // Update the polylines
        movingMarkerRef.current.coveredPolyline.setLatLngs(coveredPath);
        movingMarkerRef.current.remainingPolyline.setLatLngs(remainingPath);
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
      const pointLatLng = L.latLng(
        parseFloat(point.Latitude),
        parseFloat(point.Longitude)
      );
      const initialLatLng = L.latLng(initialY, initialX); // Note: Y is lat, X is lng
      const distance = initialLatLng.distanceTo(pointLatLng);

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
