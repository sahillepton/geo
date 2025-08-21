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
  const handleVolumeChange = (e) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (video) {
      video.volume = vol;
      setIsMuted(vol === 0);
    }
  };

  const toggleMute = () => {
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  // Seek
  const handleSeek = (e) => {
    const percent = parseFloat(e.target.value);
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
          <div
            style={{
              width: "40px",
              height: "40px",
              border: "4px solid #333",
              borderTop: "4px solid #fff",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
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
        <input
          type="range"
          min="0"
          max="100"
          value={progress}
          onChange={handleSeek}
          style={{
            width: "100%",
            appearance: "none",
            height: 4,
            borderRadius: 2,
            background: "#444",
            cursor: "pointer",
          }}
        />

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
              {isPlaying ? (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
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
              {isMuted ? (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                </svg>
              ) : (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                </svg>
              )}
            </button>

            {/* Volume */}
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleVolumeChange}
              style={{
                width: 80,
                appearance: "none",
                height: 4,
                borderRadius: 2,
                background: "#666",
                cursor: "pointer",
              }}
            />

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
