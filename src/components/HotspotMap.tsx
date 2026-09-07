import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { type RiskBand } from "@/lib/risk";
import {
  Navigation,
  Compass,
  MapPin,
  Layers,
  Locate,
  LocateFixed,
  ExternalLink,
  Footprints,
  Volume2,
  ShieldAlert,
  Crosshair,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Maximize2,
} from "lucide-react";
import { toast } from "sonner";

export type MapPoint = {
  id: string;
  lat: number;
  lon: number;
  band: RiskBand;
  label: string;
  ring?: number | undefined;
  bdi?: number | undefined;
};

interface ContainmentBuffer {
  lat: number;
  lon: number;
  radiusMeters: number;
  active: boolean;
  label?: string | undefined;
}

type TileLayerKey = "satellite" | "google_hybrid" | "streets" | "dark";

const TILE_PROVIDERS: Record<
  TileLayerKey,
  { name: string; url: string; attribution: string; maxZoom: number; subdomains?: string[] }
> = {
  satellite: {
    name: "ESRI Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP",
    maxZoom: 19,
  },
  google_hybrid: {
    name: "Google Hybrid",
    url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
    attribution: "© Google Maps (Imagery & Roads)",
    maxZoom: 20,
  },
  streets: {
    name: "OpenStreetMap",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap contributors",
    maxZoom: 19,
    subdomains: ["a", "b", "c"],
  },
  dark: {
    name: "Tactical Dark",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: "© CartoDB, © OpenStreetMap",
    maxZoom: 19,
    subdomains: ["a", "b", "c", "d"],
  },
};

// Calculate Haversine distance in meters between two lat/lon points
function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Calculate compass bearing in degrees (0° to 360°)
function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return (θ * 180 / Math.PI + 360) % 360;
}

// Convert degrees into 8-cardinal compass string
function bearingToCardinal(deg: number): string {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(deg / 45) % 8;
  return directions[index] || "N";
}

export function HotspotMap({
  points,
  selectedId,
  onSelect,
  activeContainment,
  className,
}: {
  points: MapPoint[];
  selectedId?: string | undefined;
  onSelect?: (id: string) => void;
  activeContainment?: ContainmentBuffer | undefined;
  className?: string | undefined;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const markersLayerGroupRef = useRef<any>(null);
  const navigationLayerGroupRef = useRef<any>(null);
  const bufferLayerRef = useRef<any>(null);
  const farmerMarkerRef = useRef<any>(null);
  const hasInitialFitRef = useRef(false);

  const [activeTileKey, setActiveTileKey] = useState<TileLayerKey>("google_hybrid");
  // Default farmer starting position at field gate/homestead near pasture
  const [farmerLocation, setFarmerLocation] = useState<{ lat: number; lon: number; accuracy?: number; isEstimate?: boolean } | null>({
    lat: 11.2348,
    lon: 77.7802,
    accuracy: 25,
    isEstimate: true,
  });
  const [locatingFarmer, setLocatingFarmer] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [isHudCollapsed, setIsHudCollapsed] = useState(false);

  // Optional custom pasture center if farmer wants the herd right in their own local field/yard
  const [pastureCenter, setPastureCenter] = useState<{ lat: number; lon: number; label: string } | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("herd_custom_pasture_center");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return null;
  });

  // Validate points or apply distributed positions in tight grazing proximity (~25-35m)
  const validPoints = useMemo(() => {
    if (pastureCenter) {
      return points.map((p, idx) => {
        const jitterLat = pastureCenter.lat + (((idx * 17) % 5) - 2) * 0.00025;
        const jitterLon = pastureCenter.lon + (((idx * 23) % 5) - 2) * 0.00025;
        return { ...p, lat: jitterLat, lon: jitterLon };
      });
    }

    return points.map((p, idx) => {
      const hasValid =
        typeof p.lat === "number" &&
        !isNaN(p.lat) &&
        p.lat !== 0 &&
        typeof p.lon === "number" &&
        !isNaN(p.lon) &&
        p.lon !== 0;
      if (hasValid) return p;
      const jitterLat = 11.235695 + (((idx * 17) % 5) - 2) * 0.00025;
      const jitterLon = 77.781448 + (((idx * 23) % 5) - 2) * 0.00025;
      return { ...p, lat: jitterLat, lon: jitterLon };
    });
  }, [points, pastureCenter]);

  // Selected or highest-risk animal point
  const currentTargetPoint = useMemo(() => {
    if (selectedId) {
      const found = validPoints.find((p) => p.id === selectedId);
      if (found) return found;
    }
    const critical = validPoints.find((p) => p.band === "critical");
    return critical || validPoints[0];
  }, [validPoints, selectedId]);

  // Range & Direction calculations from farmer to animal
  const navigationMetrics = useMemo(() => {
    if (!farmerLocation || !currentTargetPoint) return null;
    const distanceMeters = calculateDistanceMeters(
      farmerLocation.lat,
      farmerLocation.lon,
      currentTargetPoint.lat,
      currentTargetPoint.lon
    );
    const bearingDeg = calculateBearing(
      farmerLocation.lat,
      farmerLocation.lon,
      currentTargetPoint.lat,
      currentTargetPoint.lon
    );
    const cardinal = bearingToCardinal(bearingDeg);
    // Average walking speed in rural pasture: 4.5 km/h = 75 meters/min
    const walkingMinutes = Math.max(1, Math.round(distanceMeters / 75));

    return {
      distanceMeters,
      distanceKm: (distanceMeters / 1000).toFixed(2),
      bearingDeg: Math.round(bearingDeg),
      cardinal,
      walkingMinutes,
      formattedDistance:
        distanceMeters < 1000
          ? `${Math.round(distanceMeters)} m`
          : `${(distanceMeters / 1000).toFixed(2)} km`,
      isFar: distanceMeters > 3000,
    };
  }, [farmerLocation, currentTargetPoint]);

  // Handler: Acquire Farmer's live device location via HTML5 Geolocation API
  const handleLocateFarmer = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setLocatingFarmer(true);
    toast.info("Acquiring GPS position from your device...");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setFarmerLocation({ lat: latitude, lon: longitude, accuracy, isEstimate: false });
        setLocatingFarmer(false);
        toast.success(`Location locked: ${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E (±${Math.round(accuracy)}m)`);
      },
      (err) => {
        setLocatingFarmer(false);
        console.warn("Geolocation failed/denied:", err.message);
        toast.warn(`GPS blocked or unavailable: ${err.message}. Using farm base position.`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
    );
  }, []);

  // Handler: Zoom in directly to the farmer's current location (Zoom level 18)
  const handleZoomToFarmer = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setLocatingFarmer(true);
    toast.info("Acquiring exact GPS coordinates...");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setFarmerLocation({ lat: latitude, lon: longitude, accuracy, isEstimate: false });
        setLocatingFarmer(false);
        toast.success(`Zooming in to your GPS position (${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E)`);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([latitude, longitude], 18, { animate: true, duration: 1.2 });
        }
      },
      (err) => {
        setLocatingFarmer(false);
        console.warn("GPS error:", err.message);
        toast.info("Zooming to current farm base position.");
        if (mapInstanceRef.current && farmerLocation) {
          mapInstanceRef.current.flyTo([farmerLocation.lat, farmerLocation.lon], 18, { animate: true });
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
    );
  }, [farmerLocation]);

  // Handler: Zoom in directly to the selected animal / herd
  const handleZoomToHerd = useCallback(() => {
    if (!mapInstanceRef.current || !currentTargetPoint) return;
    mapInstanceRef.current.flyTo([currentTargetPoint.lat, currentTargetPoint.lon], 18, { animate: true, duration: 1 });
    toast.info(`Zoomed to ${currentTargetPoint.label || currentTargetPoint.id}`);
  }, [currentTargetPoint]);

  // Handler: Frame both farmer and selected animal on screen
  const handleFitWalkingTrail = useCallback(() => {
    if (!mapInstanceRef.current || !farmerLocation || !currentTargetPoint || !(window as any).L) return;
    const L = (window as any).L;
    const bounds = L.latLngBounds([
      [farmerLocation.lat, farmerLocation.lon],
      [currentTargetPoint.lat, currentTargetPoint.lon],
    ]);
    mapInstanceRef.current.fitBounds(bounds, { padding: [65, 65], maxZoom: 18 });
    toast.info("Framed walking trail in view.");
  }, [farmerLocation, currentTargetPoint]);

  // Handler: Move herd near farmer's current GPS (for testing or local farm grazing)
  const handlePlaceHerdNearMe = useCallback(() => {
    if (!farmerLocation) {
      toast.error("Please click 'Zoom to My GPS' first to lock your position.");
      return;
    }
    const newCenter = { lat: farmerLocation.lat, lon: farmerLocation.lon, label: "My Farm Location" };
    setPastureCenter(newCenter);
    try {
      localStorage.setItem("herd_custom_pasture_center", JSON.stringify(newCenter));
    } catch {}
    toast.success("Herd moved around your phone's GPS! Walking trail is now active in your pasture.");
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([farmerLocation.lat, farmerLocation.lon], 17, { animate: true });
    }
  }, [farmerLocation]);

  // Handler: Reset herd back to official Gobichettipalayam pasture
  const handleResetToGobichettipalayam = useCallback(() => {
    setPastureCenter(null);
    try {
      localStorage.removeItem("herd_custom_pasture_center");
    } catch {}
    setFarmerLocation({
      lat: 11.2348,
      lon: 77.7802,
      accuracy: 25,
      isEstimate: true,
    });
    toast.info("Reset herd to Gobichettipalayam pasture.");
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([11.235695, 77.781448], 17, { animate: true });
    }
  }, []);

  // Handler: Open Turn-by-Turn walking navigation in Google Maps app
  const handleOpenGoogleMaps = () => {
    if (!currentTargetPoint) return;
    const dest = `${currentTargetPoint.lat},${currentTargetPoint.lon}`;
    let url = `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=walking`;
    if (farmerLocation) {
      url += `&origin=${farmerLocation.lat},${farmerLocation.lon}`;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Handler: Audio compass direction readout
  const handleSpeakDirections = () => {
    if (!navigationMetrics || !currentTargetPoint) {
      toast.info("Computing walking directions...");
      return;
    }
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();

    const tagShort = currentTargetPoint.label || currentTargetPoint.id.split("-").pop() || "target";
    const text = `Target animal ${tagShort} is located ${navigationMetrics.formattedDistance} ${navigationMetrics.cardinal} from your position. Walk bearing ${navigationMetrics.bearingDeg} degrees. Estimated walk time: ${navigationMetrics.walkingMinutes} minutes.`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
    toast.success("Voice direction announced.");
  };

  // Initialize Leaflet Map (SSR safe with ResizeObserver for complete tile rendering)
  useEffect(() => {
    let isMounted = true;
    let resizeObserver: ResizeObserver | null = null;

    async function initMap() {
      if (typeof window === "undefined" || !mapContainerRef.current) return;

      const L = (await import("leaflet")).default;
      (window as any).L = L;

      if (!isMounted || !mapContainerRef.current) return;

      const defaultCenter = pastureCenter
        ? [pastureCenter.lat, pastureCenter.lon]
        : [11.235695, 77.781448];

      const map = L.map(mapContainerRef.current, {
        center: defaultCenter as any,
        zoom: 17,
        zoomControl: false,
        attributionControl: false,
      });

      L.control.zoom({ position: "bottomright" }).addTo(map);
      L.control.attribution({ position: "bottomleft", prefix: false }).addTo(map);

      const provider = TILE_PROVIDERS[activeTileKey];
      const tileLayer = L.tileLayer(provider.url, {
        attribution: provider.attribution,
        maxZoom: provider.maxZoom,
        subdomains: provider.subdomains || "abc",
      }).addTo(map);

      tileLayerRef.current = tileLayer;
      navigationLayerGroupRef.current = L.layerGroup().addTo(map);
      markersLayerGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;

      // Handle container resizing to prevent incomplete map tiles or gray blocks
      if (window.ResizeObserver && mapContainerRef.current) {
        resizeObserver = new ResizeObserver(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        });
        resizeObserver.observe(mapContainerRef.current);
      }

      setTimeout(() => {
        if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
      }, 150);
      setTimeout(() => {
        if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
      }, 500);

      setMapReady(true);
    }

    initMap();

    return () => {
      isMounted = false;
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Tile Layer when user toggles
  useEffect(() => {
    if (!mapInstanceRef.current || !(window as any).L) return;
    const L = (window as any).L;
    const provider = TILE_PROVIDERS[activeTileKey];

    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }

    tileLayerRef.current = L.tileLayer(provider.url, {
      attribution: provider.attribution,
      maxZoom: provider.maxZoom,
      subdomains: provider.subdomains || "abc",
    }).addTo(mapInstanceRef.current);

    mapInstanceRef.current.invalidateSize();
  }, [activeTileKey]);

  // Update Markers, Quarantine Circle, and Navigation Polyline
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !(window as any).L) return;
    const L = (window as any).L;
    const map = mapInstanceRef.current;
    const layerGroup = markersLayerGroupRef.current;
    const navGroup = navigationLayerGroupRef.current;

    if (!layerGroup || !navGroup) return;

    layerGroup.clearLayers();
    navGroup.clearLayers();

    // 1. Draw 3 km Quarantine Buffer Ring if active
    if (bufferLayerRef.current) {
      map.removeLayer(bufferLayerRef.current);
      bufferLayerRef.current = null;
    }

    const criticalPt = validPoints.find((p) => p.band === "critical");
    const ringCenter = activeContainment?.active
      ? [activeContainment.lat, activeContainment.lon]
      : criticalPt
      ? [criticalPt.lat, criticalPt.lon]
      : null;

    if (ringCenter && (activeContainment?.active || (criticalPt?.ring ?? 0) > 0)) {
      const radius = activeContainment?.radiusMeters || criticalPt?.ring || 3000;
      const circle = L.circle(ringCenter as any, {
        radius,
        color: "#ef4444",
        weight: 2.5,
        fillColor: "#ef4444",
        fillOpacity: 0.12,
        dashArray: "6, 6",
      }).addTo(map);

      circle.bindTooltip(
        `<div class="p-1 font-sans text-xs"><b>3 km Quarantine Perimeter</b><br/><span class="text-[10px] text-red-500 font-bold">Ring Vaccination & Movement Restriction</span></div>`,
        { permanent: false, direction: "top" }
      );

      bufferLayerRef.current = circle;
    }

    // 2. Draw Animal Markers
    validPoints.forEach((p) => {
      const isSelected = p.id === selectedId;
      const isCritical = p.band === "critical";
      const isMedium = p.band === "medium";
      const isCollarNode = p.id.includes("4471") || p.label === "4471";

      const bgCol = isCritical ? "#ef4444" : isMedium ? "#f59e0b" : "#10b981";
      const borderCol = isSelected ? "#ffffff" : isCritical ? "#7f1d1d" : isMedium ? "#78350f" : "#064e3b";
      const pulseClass = isCritical ? "animate-ping" : "";

      const iconHtml = `
        <div class="relative flex items-center justify-center cursor-pointer group">
          ${
            isCritical
              ? `<span class="absolute -inset-2 rounded-full bg-red-500 opacity-60 ${pulseClass}"></span>`
              : isCollarNode
              ? `<span class="absolute -inset-1.5 rounded-full bg-emerald-400 opacity-70 animate-ping"></span>`
              : ""
          }
          <div style="background-color: ${bgCol}; border-color: ${borderCol};" class="relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 shadow-lg transition-transform transform group-hover:scale-125 ${
        isSelected ? "ring-4 ring-white/80 scale-125" : isCollarNode ? "ring-2 ring-emerald-300" : ""
      }">
            <span class="text-[10px] font-extrabold text-white">
              ${p.label ? p.label.slice(-3) : p.id.slice(-3)}
            </span>
          </div>
          <div class="absolute -bottom-5 whitespace-nowrap rounded bg-black/85 px-1.5 py-0.5 text-[9px] font-mono font-bold text-white shadow-md pointer-events-none">
            ${isCollarNode ? `📡 ${p.label || p.id} (Live ESP8266)` : p.label || p.id}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: "custom-livestock-pin",
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([p.lat, p.lon] as any, {
        icon: customIcon,
        zIndexOffset: isSelected ? 800 : isCollarNode ? 600 : isCritical ? 500 : 100,
      }).addTo(layerGroup);

      // Smooth pan on click without zooming out!
      marker.on("click", () => {
        if (onSelect) onSelect(p.id);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.panTo([p.lat, p.lon], { animate: true, duration: 0.5 });
        }
      });

      marker.bindPopup(`
        <div class="p-2 space-y-1.5 font-sans text-xs">
          <div class="font-bold text-sm text-foreground flex items-center gap-1.5">
            <span>🏷️ ${p.id}</span>
            <span class="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
              isCritical ? "bg-red-100 text-red-700" : isMedium ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
            }">${p.band}</span>
          </div>
          <div class="text-muted-foreground text-[11px]">
            GPS: ${p.lat.toFixed(5)}°N, ${p.lon.toFixed(5)}°E<br/>
            ${typeof p.bdi === "number" ? `Health BDI: <b>${p.bdi.toFixed(2)}</b>` : ""}
          </div>
          <div class="pt-1 flex gap-1.5">
            <button onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}&travelmode=walking', '_blank')" class="w-full bg-blue-600 text-white font-bold py-1 px-2 rounded text-[10px] hover:bg-blue-700">
              Walk to Animal (Google Maps)
            </button>
          </div>
        </div>
      `);
    });

    // 3. Draw Farmer Device Location Marker if available
    if (farmerMarkerRef.current) {
      map.removeLayer(farmerMarkerRef.current);
      farmerMarkerRef.current = null;
    }

    if (farmerLocation) {
      const farmerHtml = `
        <div class="relative flex items-center justify-center">
          <span class="absolute -inset-3 rounded-full bg-blue-500 opacity-50 animate-ping"></span>
          <div class="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 border-2 border-white shadow-xl">
            <span class="text-white text-xs">🚶</span>
          </div>
          <div class="absolute -bottom-5 whitespace-nowrap rounded bg-blue-900/90 px-1.5 py-0.5 text-[9px] font-bold text-white shadow pointer-events-none">
            Farmer (You)
          </div>
        </div>
      `;

      const farmerIcon = L.divIcon({
        html: farmerHtml,
        className: "farmer-device-pin",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const farmerMarker = L.marker([farmerLocation.lat, farmerLocation.lon] as any, {
        icon: farmerIcon,
        zIndexOffset: 1000,
      }).addTo(map);

      farmerMarker.bindPopup(`
        <div class="p-2 font-sans text-xs space-y-1">
          <b>🚶 Farmer (Your Current Position)</b><br/>
          <span class="text-[11px] text-muted-foreground">${farmerLocation.lat.toFixed(5)}°N, ${farmerLocation.lon.toFixed(5)}°E</span><br/>
          <span class="text-[10px] font-bold text-blue-600">${farmerLocation.isEstimate ? "📍 Farm Gate Position" : "🎯 Real-Time GPS Locked"}</span>
        </div>
      `);

      farmerMarkerRef.current = farmerMarker;
    }

    // 4. Draw Walking Polyline & Distance Chip
    if (farmerLocation && currentTargetPoint) {
      const lineCoords = [
        [farmerLocation.lat, farmerLocation.lon],
        [currentTargetPoint.lat, currentTargetPoint.lon],
      ];

      // White outline casing for high visibility over satellite imagery
      L.polyline(lineCoords as any, {
        color: "#ffffff",
        weight: 6,
        opacity: 0.9,
      }).addTo(navGroup);

      // Vibrant blue dashed walking line
      const navLine = L.polyline(lineCoords as any, {
        color: "#2563eb",
        weight: 4,
        opacity: 1,
        dashArray: "8, 8",
        lineCap: "round",
      }).addTo(navGroup);

      navLine.bindTooltip(
        `<div class="p-1 font-sans text-xs font-bold text-blue-600 bg-white rounded shadow-sm">🚶 Walking Trail to ${currentTargetPoint.label || currentTargetPoint.id} (${navigationMetrics?.formattedDistance || ""})</div>`,
        { permanent: false, direction: "center" }
      );

      // Midpoint distance badge
      const midLat = (farmerLocation.lat + currentTargetPoint.lat) / 2;
      const midLon = (farmerLocation.lon + currentTargetPoint.lon) / 2;
      const chipHtml = `
        <div style="transform: translate(-50%, -50%);" class="inline-flex items-center gap-1 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-md border border-white whitespace-nowrap pointer-events-none">
          🚶 ${navigationMetrics?.formattedDistance || "Walking Path"}
        </div>
      `;
      L.marker([midLat, midLon] as any, {
        icon: L.divIcon({ html: chipHtml, className: "trail-dist-chip", iconSize: [0, 0] }),
        interactive: false,
      }).addTo(navGroup);
    }

    // 5. Fit bounds ONLY on initial load, NEVER on clicking an animal marker!
    if (!hasInitialFitRef.current && validPoints.length > 0) {
      const bounds = L.latLngBounds(validPoints.map((p) => [p.lat, p.lon]));
      if (farmerLocation && !navigationMetrics?.isFar) {
        bounds.extend([farmerLocation.lat, farmerLocation.lon]);
      }
      map.fitBounds(bounds, { padding: [55, 55], maxZoom: 18 });
      hasInitialFitRef.current = true;
    }
  }, [mapReady, validPoints, selectedId, activeContainment, farmerLocation, currentTargetPoint, onSelect, navigationMetrics]);

  // Handler: Fit bounds to all animals
  const handleFitAllAnimals = () => {
    if (!mapInstanceRef.current || !validPoints.length || !(window as any).L) return;
    const L = (window as any).L;
    const bounds = L.latLngBounds(validPoints.map((p) => [p.lat, p.lon]));
    if (farmerLocation && !navigationMetrics?.isFar) {
      bounds.extend([farmerLocation.lat, farmerLocation.lon]);
    }
    mapInstanceRef.current.fitBounds(bounds, { padding: [55, 55], maxZoom: 18 });
    toast.info("Fit view to herd.");
  };

  return (
    <div className={`relative isolate z-0 w-full overflow-hidden rounded-xl border border-border/80 bg-background shadow-md ${className || "h-[540px] lg:h-[560px]"}`}>
      {/* Real Map Canvas */}
      <div ref={mapContainerRef} className="h-full w-full z-0" />

      {/* Top Floating Controls Bar */}
      <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none z-30">
        {/* Left: Map Layer Switcher */}
        <div className="flex items-center gap-1 rounded-lg border border-border/80 bg-card/90 p-1 backdrop-blur shadow-md pointer-events-auto">
          <button
            type="button"
            onClick={() => setActiveTileKey("google_hybrid")}
            className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold transition cursor-pointer ${
              activeTileKey === "google_hybrid"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted"
            }`}
            title="Satellite Photo with roads & field names"
          >
            🛰️ Satellite
          </button>
          <button
            type="button"
            onClick={() => setActiveTileKey("streets")}
            className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold transition cursor-pointer ${
              activeTileKey === "streets"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted"
            }`}
            title="OpenStreetMap Roads & Paths"
          >
            🗺️ Street (OSM)
          </button>
          <button
            type="button"
            onClick={() => setActiveTileKey("satellite")}
            className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold transition cursor-pointer ${
              activeTileKey === "satellite"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted"
            }`}
            title="ESRI Field Orthophoto"
          >
            🌾 Pasture
          </button>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {/* Zoom to Farmer's Current GPS Location */}
          <button
            type="button"
            onClick={handleZoomToFarmer}
            disabled={locatingFarmer}
            className="flex items-center gap-1.5 rounded-lg border border-blue-500/50 bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-md hover:bg-blue-500 transition backdrop-blur cursor-pointer"
            title="Zoom into your phone's real-time GPS coordinates"
          >
            <Locate className={`h-4 w-4 ${locatingFarmer ? "animate-spin" : ""}`} />
            <span>{locatingFarmer ? "Locating..." : "🎯 Zoom to My GPS"}</span>
          </button>

          {/* Zoom to Herd */}
          <button
            type="button"
            onClick={handleZoomToHerd}
            className="flex items-center gap-1 rounded-lg border border-border/80 bg-card/90 px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted shadow-md backdrop-blur transition cursor-pointer"
            title="Zoom into the selected animal"
          >
            <Crosshair className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Herd</span>
          </button>

          {/* Fit All */}
          <button
            type="button"
            onClick={handleFitAllAnimals}
            className="flex items-center gap-1 rounded-lg border border-border/80 bg-card/90 px-2 py-1.5 text-xs font-semibold text-foreground hover:bg-muted shadow-md backdrop-blur transition cursor-pointer"
            title="Fit view to show all animals"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Floating Lost Animal Walking Direction HUD (Bottom-Left) */}
      <div
        className={`absolute bottom-3 left-3 z-30 transition-all duration-200 rounded-xl border border-border/80 bg-card/95 shadow-xl backdrop-blur-md ${
          isHudCollapsed ? "px-3 py-2 max-w-[280px]" : "p-3.5 max-w-sm space-y-2.5"
        }`}
      >
        <div className={`flex items-center justify-between gap-2.5 ${isHudCollapsed ? "" : "border-b border-border pb-2"}`}>
          <button
            type="button"
            onClick={() => setIsHudCollapsed(!isHudCollapsed)}
            className="flex items-center gap-2 text-left cursor-pointer hover:opacity-85 transition min-w-0"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Footprints className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] uppercase font-bold text-primary tracking-wider leading-none">
                Lost Animal Walking Pathway
              </p>
              <h4 className="text-xs font-bold text-foreground mt-0.5 flex items-center gap-1.5 truncate">
                Find: {currentTargetPoint?.label || currentTargetPoint?.id?.split("-").pop() || "Animal"}
                {navigationMetrics ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[11px] font-bold">
                    · {navigationMetrics.formattedDistance} ({navigationMetrics.cardinal})
                  </span>
                ) : null}
              </h4>
            </div>
          </button>

          <div className="flex items-center gap-1 shrink-0">
            {navigationMetrics && (
              <button
                type="button"
                onClick={handleSpeakDirections}
                className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
                title="Audio walking directions"
              >
                <Volume2 className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsHudCollapsed(!isHudCollapsed)}
              className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
              title={isHudCollapsed ? "Expand Walking Pathway" : "Minimize"}
            >
              {isHudCollapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {!isHudCollapsed && (
          <>
            {navigationMetrics ? (
              <div className="space-y-2.5">
                {/* Live Distance & Walking ETA */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-md bg-muted/60 p-2">
                    <p className="text-[10px] text-muted-foreground font-medium">Walking Range</p>
                    <p className="font-mono text-sm font-bold text-primary">{navigationMetrics.formattedDistance}</p>
                  </div>

                  <div className="rounded-md bg-muted/60 p-2">
                    <p className="text-[10px] text-muted-foreground font-medium">Compass Heading</p>
                    <p className="font-mono text-sm font-bold text-foreground flex items-center justify-center gap-1">
                      <Navigation
                        className="h-3.5 w-3.5 text-blue-500"
                        style={{ transform: `rotate(${navigationMetrics.bearingDeg}deg)` }}
                      />
                      {navigationMetrics.cardinal} ({navigationMetrics.bearingDeg}°)
                    </p>
                  </div>

                  <div className="rounded-md bg-muted/60 p-2">
                    <p className="text-[10px] text-muted-foreground font-medium">Walking ETA</p>
                    <p className="font-mono text-sm font-bold text-emerald-500 flex items-center justify-center gap-1">
                      <Footprints className="h-3.5 w-3.5" />
                      ~{navigationMetrics.walkingMinutes} min
                    </p>
                  </div>
                </div>

                {/* Notice if the farmer's device is far from the current pasture */}
                {navigationMetrics.isFar && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 space-y-1.5 text-left">
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium leading-snug">
                      📍 Your phone is currently {navigationMetrics.formattedDistance} away from the Gobichettipalayam field.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handlePlaceHerdNearMe}
                        className="inline-flex items-center gap-1 rounded bg-amber-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-amber-500 transition cursor-pointer"
                      >
                        <MapPin className="h-3 w-3" />
                        Place Herd at My Current GPS
                      </button>
                      {pastureCenter && (
                        <button
                          type="button"
                          onClick={handleResetToGobichettipalayam}
                          className="text-[10px] text-muted-foreground hover:underline cursor-pointer"
                        >
                          Reset to Gobichettipalayam
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Primary Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={handleOpenGoogleMaps}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-500 shadow transition cursor-pointer text-center"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open Google Maps
                  </button>

                  <button
                    type="button"
                    onClick={handleFitWalkingTrail}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition cursor-pointer text-center"
                    title="Frame the entire walking trail on map"
                  >
                    <Footprints className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    Fit Trail in View
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-1">
                <p className="text-xs text-muted-foreground">
                  Tap below to compute walking distance and route to this animal.
                </p>
                <button
                  type="button"
                  onClick={handleZoomToFarmer}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-primary/20 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/30 transition cursor-pointer"
                >
                  <Locate className="h-3.5 w-3.5" />
                  Show Walking Pathway to Animal
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Dynamic 3 km Containment Zone Indicator (Top-Center) */}
      {activeContainment?.active && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div className="flex items-center gap-2 rounded-full border border-critical/50 bg-critical/95 px-3 py-1 text-xs font-bold text-white shadow-lg backdrop-blur animate-pulse">
            <ShieldAlert className="h-3.5 w-3.5" />
            3 km Active Outbreak Quarantine Buffer
          </div>
        </div>
      )}
    </div>
  );
}
