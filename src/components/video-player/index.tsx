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
const VideoPlayer = ({ url, video, setVideo }) => {
  const containerRef = useRef(null);
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
    videoEl.playsInline = true;
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
    togglePlay();
    return () => {
      videoEl.pause();
      videoEl.remove();
    };
  }, [url, video, setVideo]);

  // Play / Pause
  const togglePlay = () => {
    if (!video) return;
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.warn("Play failed:", err));
    }
  };

  // Volume
  const handleVolumeChange = (newVolume) => {
    setVolume(newVolume);
    if (video) {
      video.volume = newVolume;
      setIsMuted(newVolume === 0);
    }
  };

  const toggleMute = () => {
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  // Seek
  const handleSeek = (percent) => {
    setProgress(percent);
    if (video?.duration) video.currentTime = (percent / 100) * video.duration;
  };

  // Sync time
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
      video.removeEventListener("loadedmetadata", updateTime);
      video.removeEventListener("waiting", () => setIsBuffering(true));
      video.removeEventListener("canplay", () => setIsBuffering(false));
      video.removeEventListener("canplaythrough", () => setIsBuffering(false));
    };
  }, [video]);

  // Quality
  const handleQualityChange = (index) => {
    if (!video?.hls) return;
    video.hls.currentLevel = index; // -1 = auto
    setSelectedQuality(
      index === -1 ? "Auto" : qualities.find((q) => q.index === index)?.label
    );
  };

  const formatTime = (t) => {
    if (!t) return "0:00";
    const minutes = Math.floor(t / 60);
    const seconds = Math.floor(t % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return VolumeX;
    if (volume < 0.5) return Volume1;
    return Volume2;
  };

  const VolumeIcon = getVolumeIcon();

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: "#000",
        cursor: "pointer",
      }}
      onClick={togglePlay}
    >
      <Canvas camera={{ position: [0, 0, 0.1], fov: 75 }}>
        <OrbitControls enableZoom={false} enablePan={false} />
        <Suspense fallback={null}>
          {video && <VideoSphere video={video} />}
        </Suspense>
      </Canvas>

      {/* Buffering Loader */}
      {isBuffering && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 1000,
            background: "rgba(0,0,0,0.8)",
            color: "#fff",
            padding: "20px",
            borderRadius: "10px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <Loader2 className="w-10 h-10 animate-spin" />
          <div>Buffering...</div>
        </div>
      )}

      {/* Controls (YouTube-like) */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "100%",
          background: "rgba(0,0,0,0.7)",
          padding: "8px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          zIndex: 999,
        }}
        onClick={(e) => e.stopPropagation()} // prevent togglePlay when clicking controls
      >
        {/* Progress Bar */}
        <VideoProgressBar value={progress} onChange={handleSeek} />

        {/* Bottom Controls */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: "#fff",
            fontSize: 14,
          }}
        >
          {/* Left controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={togglePlay}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "32px",
                height: "32px",
              }}
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>

            <button
              onClick={toggleMute}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "32px",
                height: "32px",
              }}
            >
              <VolumeIcon size={16} />
            </button>

            {/* Volume */}
            <VolumeProgressBar value={volume} onChange={handleVolumeChange} />

            {/* Time */}
            <span>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Right controls */}
          {qualities.length > 0 && (
            <select
              value={selectedQuality}
              onChange={(e) => {
                const idx = qualities.findIndex(
                  (q) => q.label === e.target.value
                );
                handleQualityChange(qualities[idx].index);
              }}
              style={{
                padding: "2px 6px",
                borderRadius: 4,
                border: "1px solid #555",
                background: "#111",
                color: "#fff",
                fontSize: 12,
              }}
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

    console.log("Initializing map with data:", data.length, "points");

    const firstPoint = data[0];
    const lastPoint = data[data.length - 1];

    console.log("First point:", firstPoint);
    console.log("Last point:", lastPoint);

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

      console.log("Map created:", leafletMap);

      // Add tile layers
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(leafletMap);

      // Add satellite layer
      const satelliteLayer = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "© Esri",
        }
      );

      // Layer control
      const baseMaps = {
        Street: L.tileLayer(
          "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            attribution: "© OpenStreetMap contributors",
          }
        ),
        Satellite: satelliteLayer,
      };

      L.control.layers(baseMaps).addTo(leafletMap);

      setMap(leafletMap);

      // Start & End markers (hidden, just for reference)
      startMarkerRef.current = L.marker(
        [parseFloat(firstPoint.Latitude), parseFloat(firstPoint.Longitude)],
        {
          title: "Start Point",
        }
      ).addTo(leafletMap);
      startMarkerRef.current.setOpacity(0); // Hide the marker

      endMarkerRef.current = L.marker(
        [parseFloat(lastPoint.Latitude), parseFloat(lastPoint.Longitude)],
        {
          title: "End Point",
        }
      ).addTo(leafletMap);
      endMarkerRef.current.setOpacity(0); // Hide the marker

      // Create moving marker as a red circle
      movingMarkerRef.current = L.circle(
        [parseFloat(firstPoint.Latitude), parseFloat(firstPoint.Longitude)],
        {
          radius: 8,
          color: "#FF0000",
          fillColor: "#FF0000",
          fillOpacity: 1,
          weight: 2,
        }
      ).addTo(leafletMap);

      // Add circles at start and end points
      L.circle(
        [parseFloat(firstPoint.Latitude), parseFloat(firstPoint.Longitude)],
        {
          radius: 10,
          color: "#00FF00",
          fillColor: "#00FF00",
          fillOpacity: 0.7,
          weight: 2,
        }
      ).addTo(leafletMap);

      L.circle(
        [parseFloat(lastPoint.Latitude), parseFloat(lastPoint.Longitude)],
        {
          radius: 10,
          color: "#00FF00",
          fillColor: "#00FF00",
          fillOpacity: 0.7,
          weight: 2,
        }
      ).addTo(leafletMap);

      // Add zoom control at bottom right
      L.control
        .zoom({
          position: "bottomright",
        })
        .addTo(leafletMap);

      // Polyline
      const smoothedPath = getSmoothedPath(data);
      polylineRef.current = L.polyline(smoothedPath, {
        color: "#FF0000",
        weight: 6,
        opacity: 0.8,
      }).addTo(leafletMap);

      // Fit map to show the whole route
      const bounds = L.latLngBounds(smoothedPath);
      leafletMap.fitBounds(bounds);

      accuracyCircleRef.current = L.circle(
        [parseFloat(firstPoint.Latitude), parseFloat(firstPoint.Longitude)],
        {
          radius: 0,
          color: "#4285F4",
          fillColor: "#4285F4",
          fillOpacity: 0.2,
          weight: 1,
        }
      ).addTo(leafletMap);
    }, 100);

    return () => {
      clearTimeout(timer);
      if (map) {
        map.remove();
      }
    };
  }, [mapRef, map, data]);

  // Add click handler to polyline when video is available
  useEffect(() => {
    if (!polylineRef.current || !video || !data?.length) return;

    const handlePolylineClick = (e) => {
      const clickedLatLng = e.latlng;
      console.log("Polyline clicked at:", clickedLatLng);

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

      console.log("Closest point:", closestPoint);
      console.log("Video element:", video);

      // Jump to the timestamp of the closest point
      if (video && closestPoint) {
        const timestamp = parseFloat(closestPoint.timeStamp);
        console.log("Setting video time to:", timestamp);
        video.currentTime = timestamp;
      } else {
        console.log("Video or closestPoint not available");
      }
    };

    polylineRef.current.on("click", handlePolylineClick);

    return () => {
      if (polylineRef.current) {
        polylineRef.current.off("click", handlePolylineClick);
      }
    };
  }, [video, data]);

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
      // Don't auto-pan the map - let user control it
      // map.panTo(pos);

      setCoords({ lat: lat.toFixed(6), lng: lng.toFixed(6) });

      const accuracyValue = prev.Accuracy ? parseFloat(prev.Accuracy) : 0;
      setAccuracy((accuracyValue * 100).toFixed(2));
      accuracyCircleRef.current?.setLatLng(pos);
      accuracyCircleRef.current?.setRadius(accuracyValue);

      const dist = calcDistance(
        parseFloat(data[0].Latitude),
        parseFloat(data[0].Longitude),
        lat,
        lng
      );
      setDistance(dist.toFixed(1));

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
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          zIndex: 999,
          padding: 6,
          background: "rgba(0,0,0,0.5)",
          color: "#fff",
          borderRadius: 4,
        }}
      >
        <div>Timestamp: {formatTime(timestamp)}</div>
        <div>Lat: {coords.lat}</div>
        <div>Lng: {coords.lng}</div>
        <div>Distance: {distance} m</div>
        <div>Accuracy: {accuracy} cm</div>
      </div>
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
export default function VideoWithMap({ videoUrl, locationData }) {
  console.log("videoUrl", videoUrl);
  const [video, setVideo] = useState(null);
  console.log("locationData", locationData);
  const sortedData = useMemo(() => {
    if (!locationData) return [];
    return [...locationData].sort((a, b) => a.timestamp - b.timestamp);
  }, [locationData]);

  return (
    <PanelGroup
      direction="horizontal"
      style={{ width: "100%", height: "80vh" }}
    >
      <Panel defaultSize={50} minSize={30}>
        <div style={{ width: "100%", height: "100%" }}>
          <VideoPlayer url={videoUrl} video={video} setVideo={setVideo} />
        </div>
      </Panel>
      <PanelResizeHandle />
      <Panel defaultSize={50} minSize={30}>
        <div style={{ width: "100%", height: "100%" }}>
          <SimpleMap data={sortedData} video={video} />
        </div>
      </Panel>
    </PanelGroup>
  );
}
