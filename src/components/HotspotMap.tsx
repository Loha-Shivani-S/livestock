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
}: {
  points: MapPoint[];
  selectedId?: string | undefined;
  onSelect?: (id: string) => void;
  activeContainment?: ContainmentBuffer | undefined;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const markersLayerGroupRef = useRef<any>(null);
  const bufferLayerRef = useRef<any>(null);
  const navigationLineRef = useRef<any>(null);
  const farmerMarkerRef = useRef<any>(null);

  const [activeTileKey, setActiveTileKey] = useState<TileLayerKey>("google_hybrid");
  const [farmerLocation, setFarmerLocation] = useState<{ lat: number; lon: number; accuracy?: number } | null>(null);
  const [locatingFarmer, setLocatingFarmer] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // Validate points or apply stable distributed fallback around real hardware center (11.235695, 77.781448)
  const validPoints = useMemo(() => {
    return points.map((p, idx) => {
      const hasValid =
        typeof p.lat === "number" &&
        !isNaN(p.lat) &&
        p.lat !== 0 &&
        typeof p.lon === "number" &&
        !isNaN(p.lon) &&
        p.lon !== 0;
      if (hasValid) return p;
      const jitterLat = 11.235695 + (((idx * 17) % 9) - 4) * 0.0018;
      const jitterLon = 77.781448 + (((idx * 23) % 9) - 4) * 0.0018;
      return { ...p, lat: jitterLat, lon: jitterLon };
    });
  }, [points]);

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
        setFarmerLocation({ lat: latitude, lon: longitude, accuracy });
        setLocatingFarmer(false);
        toast.success(`Location locked: ${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E (±${Math.round(accuracy)}m)`);

        // Center map to encompass both farmer and the herd
        if (mapInstanceRef.current && window.L) {
          const latLngs = [
            [latitude, longitude],
            ...validPoints.map((p) => [p.lat, p.lon]),
          ];
          mapInstanceRef.current.fitBounds(latLngs, { padding: [50, 50], maxZoom: 17 });
        }
      },
      (err) => {
        setLocatingFarmer(false);
        console.warn("Geolocation failed/denied:", err.message);
        // Provide friendly fallback: simulate farmer location at Village Center near pasture
        const fallbackLat = 11.2330;
        const fallbackLon = 77.7792;
        setFarmerLocation({ lat: fallbackLat, lon: fallbackLon, accuracy: 25 });
        toast.info("Using Village Base Station location as farmer starting point (Location permission was blocked).");
        
        if (mapInstanceRef.current && window.L) {
          mapInstanceRef.current.fitBounds(
            [
              [fallbackLat, fallbackLon],
              ...validPoints.map((p) => [p.lat, p.lon]),
            ],
            { padding: [50, 50], maxZoom: 17 }
          );
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }, [validPoints]);

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
      toast.info("Click 'Locate My Device' to compute range and voice directions.");
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

  // Initialize Leaflet Map (SSR safe)
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (typeof window === "undefined" || !mapContainerRef.current) return;

      const L = (await import("leaflet")).default;
      (window as any).L = L;

      if (!isMounted || !mapContainerRef.current) return;

      // Center around real hardware coordinates
      const defaultCenter = [11.235695, 77.781448];
      const map = L.map(mapContainerRef.current, {
        center: defaultCenter as any,
        zoom: 16,
        zoomControl: false,
        attributionControl: false,
      });

      // Add Zoom Control at bottom-right
      L.control.zoom({ position: "bottomright" }).addTo(map);

      // Attribution Control
      L.control.attribution({ position: "bottomleft", prefix: false }).addTo(map);

      // Add base tile layer
      const provider = TILE_PROVIDERS[activeTileKey];
      const tileLayer = L.tileLayer(provider.url, {
        attribution: provider.attribution,
        maxZoom: provider.maxZoom,
        subdomains: provider.subdomains || "abc",
      }).addTo(map);

      tileLayerRef.current = tileLayer;
      markersLayerGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;

      setMapReady(true);
    }

    initMap();

    return () => {
      isMounted = false;
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
  }, [activeTileKey]);

  // Update Markers, Quarantine Circle, and Navigation Line
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !(window as any).L) return;
    const L = (window as any).L;
    const map = mapInstanceRef.current;
    const layerGroup = markersLayerGroupRef.current;

    layerGroup.clearLayers();

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

      const bgCol = isCritical ? "#ef4444" : isMedium ? "#f59e0b" : "#10b981";
      const borderCol = isSelected ? "#ffffff" : isCritical ? "#7f1d1d" : isMedium ? "#78350f" : "#064e3b";
      const pulseClass = isCritical ? "animate-ping" : "";

      const iconHtml = `
        <div class="relative flex items-center justify-center cursor-pointer group">
          ${
            isCritical
              ? `<span class="absolute -inset-2 rounded-full bg-red-500 opacity-60 ${pulseClass}"></span>`
              : ""
          }
          <div style="background-color: ${bgCol}; border-color: ${borderCol};" class="relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 shadow-lg transition-transform transform group-hover:scale-125 ${
        isSelected ? "ring-4 ring-white/80 scale-125" : ""
      }">
            <span class="text-[10px] font-extrabold text-white">
              ${p.label ? p.label.slice(-3) : p.id.slice(-3)}
            </span>
          </div>
          <div class="absolute -bottom-5 whitespace-nowrap rounded bg-black/85 px-1.5 py-0.5 text-[9px] font-mono font-bold text-white shadow-md pointer-events-none">
            ${p.label || p.id}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: "custom-livestock-pin",
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([p.lat, p.lon] as any, { icon: customIcon }).addTo(layerGroup);

      marker.on("click", () => {
        if (onSelect) onSelect(p.id);
      });

      marker.bindPopup(`
        <div class="p-2 space-y-1 font-sans text-xs">
          <div class="font-bold text-sm text-foreground flex items-center gap-1.5">
            <span>🏷️ ${p.id}</span>
            <span class="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
              isCritical ? "bg-red-100 text-red-700" : isMedium ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
            }">${p.band}</span>
          </div>
          <div class="text-muted-foreground text-[11px]">
            GPS: ${p.lat.toFixed(4)}°N, ${p.lon.toFixed(4)}°E<br/>
            ${typeof p.bdi === "number" ? `BDI Score: <b>${p.bdi.toFixed(2)}</b>` : ""}
          </div>
          <div class="pt-1 flex gap-1.5">
            <button onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}&travelmode=walking', '_blank')" class="w-full bg-blue-600 text-white font-bold py-1 px-2 rounded text-[10px] hover:bg-blue-700">
              Navigate with Google Maps
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
        <div class="p-1 font-sans text-xs">
          <b>Your Current GPS Position</b><br/>
          <span class="text-[11px] text-muted-foreground">${farmerLocation.lat.toFixed(4)}°N, ${farmerLocation.lon.toFixed(4)}°E</span>
        </div>
      `);

      farmerMarkerRef.current = farmerMarker;
    }

    // 4. Draw Animated Direction Polyline from Farmer -> Selected/Critical Animal
    if (navigationLineRef.current) {
      map.removeLayer(navigationLineRef.current);
      navigationLineRef.current = null;
    }

    if (farmerLocation && currentTargetPoint) {
      const lineCoords = [
        [farmerLocation.lat, farmerLocation.lon],
        [currentTargetPoint.lat, currentTargetPoint.lon],
      ];

      const navLine = L.polyline(lineCoords as any, {
        color: "#3b82f6",
        weight: 3.5,
        opacity: 0.85,
        dashArray: "8, 8",
        lineCap: "round",
      }).addTo(map);

      navigationLineRef.current = navLine;
    }
  }, [mapReady, validPoints, selectedId, activeContainment, farmerLocation, currentTargetPoint, onSelect]);

  // Handler: Fit bounds to all animals
  const handleFitAllAnimals = () => {
    if (!mapInstanceRef.current || !validPoints.length) return;
    const coords = validPoints.map((p) => [p.lat, p.lon]);
    if (farmerLocation) coords.push([farmerLocation.lat, farmerLocation.lon]);
    mapInstanceRef.current.fitBounds(coords as any, { padding: [50, 50], maxZoom: 16 });
  };

  return (
    <div className="relative h-[480px] w-full overflow-hidden rounded-xl border border-border/80 bg-background shadow-md">
      {/* Real Map Canvas */}
      <div ref={mapContainerRef} className="h-full w-full z-0" />

      {/* Top Floating Controls Bar */}
      <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none z-[500]">
        {/* Left: Map Layer Switcher (No API Key required) */}
        <div className="flex items-center gap-1 rounded-lg border border-border/80 bg-card/90 p-1 backdrop-blur shadow-md pointer-events-auto">
          <button
            type="button"
            onClick={() => setActiveTileKey("google_hybrid")}
            className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold transition ${
              activeTileKey === "google_hybrid"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted"
            }`}
            title="Satellite Photo with roads & field names"
          >
            🛰️ Satellite (Google)
          </button>
          <button
            type="button"
            onClick={() => setActiveTileKey("satellite")}
            className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold transition ${
              activeTileKey === "satellite"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted"
            }`}
            title="High-resolution ESRI Aerial Orthophoto"
          >
            🌾 ESRI Pasture
          </button>
          <button
            type="button"
            onClick={() => setActiveTileKey("streets")}
            className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold transition ${
              activeTileKey === "streets"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted"
            }`}
            title="OpenStreetMap Topographic Roads"
          >
            🗺️ Street (OSM)
          </button>
        </div>

        {/* Right: Farmer Geolocation & Recenter Quick Buttons */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            type="button"
            onClick={handleLocateFarmer}
            disabled={locatingFarmer}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold shadow-md transition backdrop-blur ${
              farmerLocation
                ? "border-blue-500/50 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                : "border-primary/50 bg-primary/20 text-primary hover:bg-primary/30"
            }`}
          >
            {farmerLocation ? (
              <LocateFixed className="h-4 w-4 text-blue-400 animate-pulse" />
            ) : (
              <Locate className={`h-4 w-4 ${locatingFarmer ? "animate-spin" : ""}`} />
            )}
            <span>{locatingFarmer ? "Locking GPS..." : farmerLocation ? "GPS Locked" : "Locate My Device"}</span>
          </button>

          <button
            type="button"
            onClick={handleFitAllAnimals}
            className="flex items-center gap-1 rounded-lg border border-border/80 bg-card/90 px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted shadow-md backdrop-blur transition"
            title="Fit view to show all animals and yourself"
          >
            <Crosshair className="h-3.5 w-3.5" />
            <span>Fit All</span>
          </button>
        </div>
      </div>

      {/* Floating Rangefinder & Lost Animal Direction HUD (Bottom-Left) */}
      <div className="absolute bottom-4 left-3 z-[500] max-w-sm rounded-xl border border-border/80 bg-card/95 p-3.5 shadow-xl backdrop-blur-md space-y-2.5">
        <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 text-primary">
              <Compass className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider leading-none">
                Rangefinder & Direction HUD
              </p>
              <h4 className="text-xs font-bold text-foreground mt-0.5 flex items-center gap-1.5">
                Target: {currentTargetPoint?.label || currentTargetPoint?.id || "None"}
                {currentTargetPoint?.band === "critical" && (
                  <span className="rounded bg-critical px-1.5 py-0.2 text-[9px] font-bold text-white animate-pulse">
                    Outbreak
                  </span>
                )}
              </h4>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSpeakDirections}
            className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition"
            title="Audio compass directions"
          >
            <Volume2 className="h-4 w-4" />
          </button>
        </div>

        {navigationMetrics ? (
          <div className="space-y-2">
            {/* Live Distance & Walking ETA */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md bg-muted/60 p-2">
                <p className="text-[10px] text-muted-foreground font-medium">Distance</p>
                <p className="font-mono text-sm font-bold text-primary">{navigationMetrics.formattedDistance}</p>
              </div>

              <div className="rounded-md bg-muted/60 p-2">
                <p className="text-[10px] text-muted-foreground font-medium">Bearing</p>
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

            {/* Turn-by-Turn in Google Maps Action Button */}
            <button
              type="button"
              onClick={handleOpenGoogleMaps}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-500 shadow-md transition"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Navigate to Herd in Google Maps
            </button>
          </div>
        ) : (
          <div className="text-center py-1">
            <p className="text-xs text-muted-foreground">
              Farmer is at home and herd is grazing?
            </p>
            <button
              type="button"
              onClick={handleLocateFarmer}
              className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-primary/20 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/30 transition"
            >
              <Locate className="h-3.5 w-3.5" />
              Get My Location & Show Directions
            </button>
          </div>
        )}
      </div>

      {/* Dynamic 3 km Containment Zone Indicator (Top-Center) */}
      {activeContainment?.active && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-[500] pointer-events-none">
          <div className="flex items-center gap-2 rounded-full border border-critical/50 bg-critical/95 px-3 py-1 text-xs font-bold text-white shadow-lg backdrop-blur animate-pulse">
            <ShieldAlert className="h-3.5 w-3.5" />
            3 km Active Outbreak Quarantine Buffer
          </div>
        </div>
      )}
    </div>
  );
}
