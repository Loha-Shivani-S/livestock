import { useMemo, type ReactNode } from "react";
import mapImage from "@/assets/map-basemap.jpg";
import { type RiskBand } from "@/lib/risk";

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

const VILLAGE_LANDMARKS = [
  { name: "Dindori (HQ)", lat: 20.2014, lon: 73.8341 },
  { name: "Varwandi", lat: 20.2312, lon: 73.8124 },
  { name: "Ambegaon", lat: 20.1789, lon: 73.8652 },
  { name: "Nanashi", lat: 20.2456, lon: 73.8741 },
  { name: "Janori", lat: 20.1624, lon: 73.8115 },
];

const BAND_COLORS: Record<RiskBand, { fill: string; stroke: string; glow: string }> = {
  low: {
    fill: "#22c55e",
    stroke: "#15803d",
    glow: "rgba(34, 197, 94, 0.3)",
  },
  medium: {
    fill: "#f59e0b",
    stroke: "#b45309",
    glow: "rgba(245, 158, 11, 0.4)",
  },
  critical: {
    fill: "#ef4444",
    stroke: "#b91c1c",
    glow: "rgba(239, 68, 68, 0.5)",
  },
};

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
  // Ensure points have valid coordinates in Dindori block
  const validPoints = useMemo(() => {
    return points.map((p, idx) => {
      const hasValidCoord =
        typeof p.lat === "number" &&
        p.lat > 18 &&
        p.lat < 22 &&
        typeof p.lon === "number" &&
        p.lon > 72 &&
        p.lon < 76;
      if (hasValidCoord) return p;
      // Offset fallback coordinates around Dindori HQ
      const jitterLat = 20.2014 + (((idx * 17) % 9) - 4) * 0.007;
      const jitterLon = 73.8341 + (((idx * 23) % 9) - 4) * 0.007;
      return { ...p, lat: jitterLat, lon: jitterLon };
    });
  }, [points]);

  const bounds = useMemo(() => {
    const lats = validPoints.map((p) => p.lat);
    const lons = validPoints.map((p) => p.lon);
    const allLats = lats.length ? [...lats, ...VILLAGE_LANDMARKS.map((v) => v.lat)] : VILLAGE_LANDMARKS.map((v) => v.lat);
    const allLons = lons.length ? [...lons, ...VILLAGE_LANDMARKS.map((v) => v.lon)] : VILLAGE_LANDMARKS.map((v) => v.lon);
    return {
      minLat: Math.min(...allLats) - 0.018,
      maxLat: Math.max(...allLats) + 0.018,
      minLon: Math.min(...allLons) - 0.022,
      maxLon: Math.max(...allLons) + 0.022,
    };
  }, [validPoints]);

  const toXY = (lat: number, lon: number) => {
    const x = ((lon - bounds.minLon) / (bounds.maxLon - bounds.minLon)) * 100;
    const y = 100 - ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 100;
    return { x: Math.max(6, Math.min(94, x)), y: Math.max(6, Math.min(94, y)) };
  };

  // Determine if active 3 km quarantine buffer ring should render
  const criticalPoint = validPoints.find((p) => p.band === "critical" && (p.ring || 0) > 0);
  const ringTarget = activeContainment?.active
    ? activeContainment
    : criticalPoint
    ? {
        lat: criticalPoint.lat,
        lon: criticalPoint.lon,
        radiusMeters: criticalPoint.ring || 3000,
        active: true,
        label: `${(criticalPoint.ring || 3000) / 1000} km Quarantine Perimeter`,
      }
    : null;

  return (
    <div className="relative h-[480px] min-h-[420px] w-full overflow-hidden rounded-xl border border-border bg-slate-900 shadow-inner select-none">
      {/* Terrain basemap satellite texture */}
      <img
        src={mapImage}
        alt="District terrain basemap"
        className="absolute inset-0 h-full w-full object-cover opacity-60 saturate-125"
      />

      {/* Military GIS coordinate grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0c_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0c_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] pointer-events-none" />

      {/* Compass rose watermark */}
      <div className="absolute top-4 right-4 text-[10px] font-mono font-bold tracking-widest text-muted-foreground/60 pointer-events-none">
        N ↑
      </div>

      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <radialGradient id="containmentGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(239, 68, 68, 0.40)" />
            <stop offset="60%" stopColor="rgba(239, 68, 68, 0.20)" />
            <stop offset="100%" stopColor="rgba(239, 68, 68, 0.02)" />
          </radialGradient>
          <filter id="shadowFilter" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0.5" stdDeviation="0.6" floodColor="#000000" floodOpacity="0.8" />
          </filter>
        </defs>

        {/* Dynamic 3 km / 5 km Quarantine Circle (State 3 Only) */}
        {ringTarget && ringTarget.active && (() => {
          const { x, y } = toXY(ringTarget.lat, ringTarget.lon);
          const km = ringTarget.radiusMeters / 1000;
          const rPx = (km / ((bounds.maxLat - bounds.minLat) * 111)) * 100 * 0.95;

          return (
            <g key="active-containment-ring">
              {/* Semi-transparent red fill with glowing perimeter */}
              <circle
                cx={`${x}%`}
                cy={`${y}%`}
                r={`${rPx}%`}
                fill="url(#containmentGlow)"
                stroke="#ef4444"
                strokeWidth="1.2"
                strokeDasharray="3 2"
                className="animate-pulse"
              />
              {/* Outer boundary warning ring */}
              <circle
                cx={`${x}%`}
                cy={`${y}%`}
                r={`${rPx * 1.05}%`}
                fill="none"
                stroke="rgba(239, 68, 68, 0.45)"
                strokeWidth="0.6"
              />
              {/* Quarantine label path banner */}
              <text
                x={`${x}%`}
                y={`${Math.max(6, y - rPx - 2)}%`}
                textAnchor="middle"
                fill="#ef4444"
                fontSize="2.8"
                fontWeight="bold"
                filter="url(#shadowFilter)"
                letterSpacing="0.05em"
              >
                ⚠ 3 KM EPIDEMIOLOGICAL QUARANTINE PERIMETER
              </text>
              {/* Center index crosshairs */}
              <line x1={`${x - 2.5}%`} y1={`${y}%`} x2={`${x + 2.5}%`} y2={`${y}%`} stroke="#ef4444" strokeWidth="0.8" />
              <line x1={`${x}%`} y1={`${y - 2.5}%`} x2={`${x}%`} y2={`${y + 2.5}%`} stroke="#ef4444" strokeWidth="0.8" />
            </g>
          );
        })()}

        {/* Village Landmarks */}
        {VILLAGE_LANDMARKS.map((vl) => {
          const { x, y } = toXY(vl.lat, vl.lon);
          return (
            <g key={vl.name} opacity={0.85}>
              <circle cx={`${x}%`} cy={`${y}%`} r="0.9" fill="#94a3b8" />
              <text
                x={`${x}%`}
                y={`${y + 3.2}%`}
                textAnchor="middle"
                fill="#cbd5e1"
                fontSize="2.4"
                fontWeight="600"
                filter="url(#shadowFilter)"
              >
                {vl.name}
              </text>
            </g>
          );
        })}

        {/* Herd / Animal Telemetry Markers */}
        {validPoints.map((p) => {
          const { x, y } = toXY(p.lat, p.lon);
          const selected = selectedId === p.id;
          const isCritical = p.band === "critical";
          const isMedium = p.band === "medium";
          const colors = BAND_COLORS[p.band] || BAND_COLORS.low;

          return (
            <g
              key={p.id}
              className="cursor-pointer transition-transform duration-150 hover:opacity-100"
              onClick={() => onSelect?.(p.id)}
            >
              {/* Target reticle for currently selected animal */}
              {selected && (
                <circle
                  cx={`${x}%`}
                  cy={`${y}%`}
                  r="4.2"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="0.8"
                  strokeDasharray="1.5 1.5"
                />
              )}

              {/* Pulsing ring for critical outbreak cases */}
              {isCritical && (
                <circle
                  cx={`${x}%`}
                  cy={`${y}%`}
                  r={selected ? "5.0" : "4.0"}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="0.9"
                  className="animate-ping opacity-65"
                />
              )}

              {/* Amber aura for sentinel pre-clinical anomaly */}
              {isMedium && (
                <circle
                  cx={`${x}%`}
                  cy={`${y}%`}
                  r={selected ? "4.2" : "3.4"}
                  fill="rgba(245, 158, 11, 0.25)"
                  stroke="#f59e0b"
                  strokeWidth="0.6"
                />
              )}

              {/* Core Marker Node with SVG fill */}
              <circle
                cx={`${x}%`}
                cy={`${y}%`}
                r={selected ? "2.6" : isCritical ? "2.2" : "1.8"}
                fill={colors.fill}
                stroke={selected ? "#ffffff" : colors.stroke}
                strokeWidth={selected ? "0.9" : "0.5"}
                filter="url(#shadowFilter)"
              />

              {/* Tag Label */}
              <text
                x={`${x}%`}
                y={`${y - (selected ? 3.4 : 2.6)}%`}
                textAnchor="middle"
                fill={selected ? "#ffffff" : isCritical ? "#fca5a5" : isMedium ? "#fde68a" : "#bbf7d0"}
                fontSize={selected ? "2.7" : "2.2"}
                fontWeight={selected ? "bold" : "600"}
                filter="url(#shadowFilter)"
              >
                {p.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Top Map Badges */}
      <div className="absolute top-2 left-2 flex flex-wrap items-center gap-2 pointer-events-none">
        <div className="rounded-md border border-border/80 bg-card/90 px-2.5 py-1 text-[10px] font-mono text-foreground backdrop-blur shadow-sm">
          GIS Sector: <span className="text-primary font-semibold">Dindori (20.20°N, 73.83°E)</span>
        </div>
        {ringTarget && ringTarget.active && (
          <div className="flex items-center gap-1.5 rounded-md border border-critical/60 bg-critical/90 px-2.5 py-1 text-[10px] font-bold text-critical-foreground backdrop-blur shadow-sm animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
            Active 3 km Containment Zone
          </div>
        )}
      </div>

      {/* Bottom Left: Gateway Info */}
      <div className="absolute bottom-2 left-2 rounded-md border border-border/80 bg-card/90 px-2.5 py-1 text-[10px] text-muted-foreground backdrop-blur shadow-sm pointer-events-none">
        LoRa GIS Gateway: <span className="text-foreground font-medium">GW-DINDORI-01</span> · Range: 15 km
      </div>

      {/* Bottom Right: Status Legend */}
      <div className="absolute bottom-2 right-2 flex items-center gap-2.5 rounded-md border border-border/80 bg-card/90 px-2.5 py-1 text-[10px] font-medium backdrop-blur shadow-sm pointer-events-none">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Normal</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Pre-clinical</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" /> Critical</span>
      </div>
    </div>
  );
}
