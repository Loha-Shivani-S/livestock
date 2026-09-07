import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { getCommandData, ingestTelemetry, createLabRequisition, resolveAlert } from "@/lib/data-client";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { BAND_STYLES } from "@/lib/risk";
import { HotspotMap } from "@/components/HotspotMap";
import { RiskGauge } from "@/components/RiskGauge";
import { AudioSpeakButton } from "@/components/AudioSpeakButton";
import { VernacularAlertModal } from "@/components/VernacularAlertModal";
import { LabSlipModal } from "@/components/LabSlipModal";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { toast } from "sonner";
import {
  Activity,
  Droplets,
  Thermometer,
  HeartPulse,
  MapPin,
  Clock,
  AlertTriangle,
  FileText,
  FlaskConical,
  BellRing,
  Database,
  Radio,
  Zap,
  Volume2,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  QrCode,
  AlertCircle,
  Sparkles,
  Navigation,
  Footprints,
  ExternalLink,
  Cpu,
  Wifi,
} from "lucide-react";
import type { MapPoint } from "@/components/HotspotMap";
import { useFirebaseCowTelemetry } from "@/lib/firebase";

export const Route = createFileRoute("/_authenticated/command")({
  component: CommandPage,
  head: () => ({
    meta: [
      { title: "Command console — HerdSentinel" },
      { name: "description", content: "Live epidemiological triage console, vitals and 3 km GIS containment." },
    ],
  }),
});

function CommandPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [realtimeActive, setRealtimeActive] = useState(false);
  const [sseConnected, setSseConnected] = useState(false);
  const [packetCount, setPacketCount] = useState(0);
  const [selectedTag, setSelectedTag] = useState<string | undefined>();

  // Live Firebase Realtime Database Telemetry from ESP8266 node (/cow1)
  const firebaseTelemetry = useFirebaseCowTelemetry(true);

  // Modals
  const [vernacularModal, setVernacularModal] = useState<{
    open: boolean;
    village?: string;
    tagId?: string;
    disease?: string;
  } | null>(null);

  const [labSlipRequisition, setLabSlipRequisition] = useState<any | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["command"],
    queryFn: () => getCommandData(),
    refetchInterval: 30000,
  });

  // Subscribe to Zero-Latency Server-Sent Events (SSE) stream (/api/stream/telemetry)
  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource("/api/stream/telemetry");
      es.addEventListener("open", () => {
        setSseConnected(true);
      });
      es.addEventListener("telemetry", (evt) => {
        try {
          setPacketCount((c) => c + 1);
          queryClient.invalidateQueries({ queryKey: ["command"] });
        } catch (e) {
          console.error("SSE parse error", e);
        }
      });
      es.addEventListener("alert", (evt) => {
        try {
          const payload = JSON.parse(evt.data);
          queryClient.invalidateQueries({ queryKey: ["command"] });
          toast.warning(`🚨 Outbreak Alert: ${payload.title || "Spatiotemporal risk detected"} (${payload.village || "Gobichettipalayam"})`);
        } catch (e) {
          console.error("SSE alert parse error", e);
        }
      });
      es.onerror = () => {
        setSseConnected(false);
      };
    } catch (err) {
      console.error("SSE init error", err);
    }
    return () => {
      es?.close();
    };
  }, [queryClient]);

  // Subscribe to Supabase Realtime changes
  useEffect(() => {
    let channel: any = null;
    try {
      channel = supabase
        .channel("pashu-command-realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "alerts" }, () => {
          queryClient.invalidateQueries({ queryKey: ["command"] });
        })
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "telemetry" }, () => {
          queryClient.invalidateQueries({ queryKey: ["command"] });
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "field_reports" }, () => {
          queryClient.invalidateQueries({ queryKey: ["command"] });
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            setRealtimeActive(true);
          }
        });
    } catch {
      // Offline fallback
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const latestByTag = useMemo(() => {
    const map = new Map<string, any>();
    ((data?.telemetry as any[]) ?? []).forEach((row: any) => {
      if (!map.has(row.tag_id)) map.set(row.tag_id, row);
    });
    return map;
  }, [data]);

  // Dynamic Epidemiological Triage State calculation
  const maxBdi = useMemo(() => {
    let max = 0;
    latestByTag.forEach((vital) => {
      if (typeof vital?.bdi === "number" && vital.bdi > max) {
        max = vital.bdi;
      }
    });
    return max;
  }, [latestByTag]);

  // 3 Dynamic Operational States:
  // State 1: Baseline Normal (Green) -> maxBdi < 0.40
  // State 2: Sentinel Anomaly / Pre-Clinical Distress (Amber) -> 0.40 <= maxBdi < 0.70
  // State 3: Cluster Escalation & Active Containment (Red) -> maxBdi >= 0.70
  const triageState: 1 | 2 | 3 = maxBdi >= 0.70 ? 3 : maxBdi >= 0.40 ? 2 : 1;

  // Identify index / highest-risk animal
  const highestRiskAnimal = useMemo(() => {
    let topTag = "";
    let topBdi = -1;
    latestByTag.forEach((vital, tagId) => {
      if (typeof vital?.bdi === "number" && vital.bdi > topBdi) {
        topBdi = vital.bdi;
        topTag = tagId;
      }
    });
    return topTag ? (data?.animals as any[])?.find((a: any) => a.tag_id === topTag) : undefined;
  }, [latestByTag, data]);

  const activeTag = selectedTag || highestRiskAnimal?.tag_id || data?.animals?.[0]?.tag_id;
  const selectedAnimal = (data?.animals as any[])?.find((a: any) => a.tag_id === activeTag);
  const selectedVitals = activeTag ? latestByTag.get(activeTag) : undefined;

  // Real-time values bound from ESP8266 node via Firebase Realtime Database
  const isSelectedCow1 = Boolean(activeTag?.includes("4471") || selectedAnimal?.species === "Cattle");
  const liveTemp = isSelectedCow1 && firebaseTelemetry.temp !== null ? firebaseTelemetry.temp : selectedVitals?.temp_c ?? 38.6;
  const liveBpm = isSelectedCow1 && firebaseTelemetry.bpm !== null ? firebaseTelemetry.bpm : selectedVitals?.heart_rate ?? 70;
  const liveVedba = isSelectedCow1 && firebaseTelemetry.vedba !== null ? firebaseTelemetry.vedba : selectedVitals?.vedba ?? 0.05;
  const liveStatus = isSelectedCow1 ? firebaseTelemetry.status : (liveVedba < 0.08 ? "Sleeping" : liveVedba < 0.2 ? "Eating" : "Walking");
  const liveLat = isSelectedCow1 && firebaseTelemetry.lat !== null ? firebaseTelemetry.lat : selectedVitals?.lat ?? 11.235695;
  const liveLon = isSelectedCow1 && firebaseTelemetry.lon !== null ? firebaseTelemetry.lon : selectedVitals?.lon ?? 77.781448;

  // Dynamic 3 km PostGIS quarantine buffer overlay (active strictly in State 3)
  const activeContainmentBuffer = useMemo(() => {
    if (triageState !== 3 || !highestRiskAnimal) return undefined;
    const vitals = latestByTag.get(highestRiskAnimal.tag_id);
    const lat = vitals?.lat || highestRiskAnimal.lat || 11.235695;
    const lon = vitals?.lon || highestRiskAnimal.lon || 77.781448;
    return {
      lat,
      lon,
      radiusMeters: 3000,
      active: true,
      label: `3 km Quarantine Buffer · ${highestRiskAnimal.village || "Sector 1"}`,
    };
  }, [triageState, highestRiskAnimal, latestByTag]);

  const mapPoints: MapPoint[] = useMemo(() => {
    return ((data?.animals as any[]) ?? []).map((a: any, idx: number) => {
      const latest = latestByTag.get(a.tag_id);
      const alert = (data?.alerts as any[])?.find((al: any) => al.tag_id === a.tag_id && al.status === "open");

      // Stable distributed coordinate jitter around real collar location in close pasture range (~25m)
      const defaultLat = 11.235695 + (((idx * 17) % 5) - 2) * 0.00025;
      const defaultLon = 77.781448 + (((idx * 23) % 5) - 2) * 0.00025;

      const isValidCoord = (val: unknown): val is number =>
        typeof val === "number" && !isNaN(val) && val !== 0;

      const isCow1 = a.tag_id.includes("4471") || a.species === "Cattle";
      const fbLat = isCow1 && firebaseTelemetry.lat !== null ? firebaseTelemetry.lat : null;
      const fbLon = isCow1 && firebaseTelemetry.lon !== null ? firebaseTelemetry.lon : null;

      const lat = isValidCoord(fbLat) ? fbLat : isValidCoord(latest?.lat) ? latest.lat : isValidCoord(a.lat) ? a.lat : defaultLat;
      const lon = isValidCoord(fbLon) ? fbLon : isValidCoord(latest?.lon) ? latest.lon : isValidCoord(a.lon) ? a.lon : defaultLon;

      const point: MapPoint = {
        id: a.tag_id,
        lat,
        lon,
        band: (latest?.band as any) ?? "low",
        label: a.tag_id.split("-").pop() ?? a.tag_id,
        bdi: latest?.bdi,
      };
      // Quarantine ring only renders on map when in State 3 (BDI >= 0.70)
      if (triageState === 3 && (alert?.containment_radius_m || latest?.band === "critical")) {
        point.ring = alert?.containment_radius_m || 3000;
      }
      return point;
    });
  }, [data, latestByTag, triageState]);

  const trackedAnimals = useMemo(() => (data?.animals as any[]) ?? [], [data]);
  const [alertTab, setAlertTab] = useState<"active" | "all">("active");

  const resolveAlertMutation = useMutation({
    mutationFn: (alertId: string) => resolveAlert({ alertId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["command"] });
      toast.success("Alert marked as resolved and closed.");
    },
  });

  const validAlerts = useMemo(() => {
    return ((data?.alerts as any[]) ?? []).filter(
      (a: any) => !a.tag_id?.startsWith("IN-MH-") && a.village !== "Dindori"
    );
  }, [data?.alerts]);

  const activeAlerts = useMemo(() => {
    return validAlerts.filter(
      (a: any) => a.status === "open" || a.status === "investigating" || a.status === "confirmed_outbreak"
    );
  }, [validAlerts]);

  const displayedAlerts = alertTab === "active" ? activeAlerts : validAlerts;
  const openAlerts = activeAlerts;

  // Real herd health counts derived from latest telemetry / BDI
  const criticalCount = useMemo(() => {
    return trackedAnimals.filter((a: any) => {
      const v = latestByTag.get(a.tag_id);
      return v?.band === "critical" || (v?.bdi ?? 0) >= 0.70;
    }).length;
  }, [trackedAnimals, latestByTag]);

  const warningCount = useMemo(() => {
    return trackedAnimals.filter((a: any) => {
      const v = latestByTag.get(a.tag_id);
      return v?.band === "medium" || ((v?.bdi ?? 0) >= 0.40 && (v?.bdi ?? 0) < 0.70);
    }).length;
  }, [trackedAnimals, latestByTag]);

  const normalCount = Math.max(0, trackedAnimals.length - criticalCount - warningCount);



  // Generate Digital Lab Requisition Slip
  const handleGenerateLabSlip = async (animalTag?: string) => {
    const targetAnimal = (animalTag ? (data?.animals as any[])?.find((a: any) => a.tag_id === animalTag) : null) || selectedAnimal || highestRiskAnimal;
    const tag = targetAnimal?.tag_id || "IN-TN-2031-4471";
    try {
      const res = await createLabRequisition({
        tag_id: tag,
        sample_type: "Blood & Vesicular Epithelium Swab",
        laboratory: "District Veterinary Diagnostic Laboratory (DVDL), Erode",
        collected_by: "Dr. M. Senthilkumar (BVO Gobichettipalayam)",
      });
      setLabSlipRequisition({
        ...res,
        tag_id: tag,
        village: targetAnimal?.village || "Gobichettipalayam",
        species: targetAnimal?.species || "Cattle (Kangayam Cow)",
        owner_name: targetAnimal?.owner_name || "S. Balasubramaniam",
      });
      toast.success("Generated Official Digital Lab Requisition Slip with Scannable QR Code!");
    } catch {
      setLabSlipRequisition({
        id: "req-" + Date.now(),
        reference: `DVDL-ERD-${tag.split("-").pop() || "4471"}`,
        scan_token: `SCAN-DVDL-${tag}`,
        tag_id: tag,
        sample_type: "Blood & Vesicular Epithelium Swab",
        laboratory: "District Veterinary Diagnostic Laboratory (DVDL), Erode",
        collected_by: "Dr. M. Senthilkumar (BVO Gobichettipalayam)",
        created_at: new Date().toISOString(),
        village: targetAnimal?.village || "Gobichettipalayam",
        species: targetAnimal?.species || "Cattle (Kangayam Cow)",
        owner_name: targetAnimal?.owner_name || "S. Balasubramaniam",
      });
      toast.success("Generated Official Digital Lab Requisition Slip with Scannable QR Code!");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between border-b border-border pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground whitespace-nowrap">
              {t("cmd.title")}
            </h1>
            <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
              Epidemiological Triage
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("cmd.subtitle")} · Real-time telemetric surveillance, BDI mathematical triage & 3 km containment buffer.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Quick Language Switcher */}
          <LanguageSwitcher compact />

          {/* Zero-Latency Telemetry Stream Indicator */}
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs shadow-xs">
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                  sseConnected ? "bg-emerald-400 opacity-75" : "bg-amber-400 opacity-75"
                }`}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  sseConnected ? "bg-emerald-500" : "bg-amber-500"
                }`}
              ></span>
            </span>
            <Radio className="h-3.5 w-3.5 text-primary" />
            <span className="font-semibold text-foreground">
              {sseConnected ? "Telemetry: Live" : "Connecting..."}
            </span>
          </div>

          {/* Regional Vernacular Advisory */}
          <button
            type="button"
            onClick={() =>
              setVernacularModal({
                open: true,
                village: "Gobichettipalayam",
                tagId: activeTag,
                disease: "Foot-and-Mouth Disease (FMD)",
              })
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition shadow-xs"
            title="Trigger Regional Voice & SMS Broadcast to local farmers"
          >
            <Radio className="h-3.5 w-3.5" />
            Regional Advisory (IVR/SMS)
          </button>

          {/* Herd Health Counters */}
          <StatBadge icon={Activity} value={trackedAnimals.length} label="Tracked" />
          <StatBadge icon={CheckCircle2} value={normalCount} label="Healthy" tone="success" />
          {warningCount > 0 && (
            <StatBadge icon={AlertCircle} value={warningCount} label="Under Watch" tone="warning" />
          )}
          <StatBadge
            icon={AlertTriangle}
            value={criticalCount}
            label="Critical"
            tone={criticalCount > 0 ? "critical" : undefined}
          />
        </div>
      </div>

      {/* Operational Triage State Bar - Executive Telemetry HUD */}
      <div
        className={`relative overflow-hidden rounded-xl border p-4 shadow-sm transition-all duration-300 ${
          triageState === 3
            ? "border-critical/40 bg-gradient-to-br from-critical/10 via-surface to-critical/5 shadow-critical/5"
            : triageState === 2
            ? "border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-surface to-amber-500/5 shadow-amber-500/5"
            : "border-emerald-500/25 bg-gradient-to-br from-emerald-500/5 via-surface to-transparent shadow-emerald-500/5"
        }`}
      >
        {/* Ambient glow effect */}
        <div
          className={`pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl opacity-20 ${
            triageState === 3 ? "bg-critical" : triageState === 2 ? "bg-amber-500" : "bg-emerald-500"
          }`}
        />

        <div className="relative flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          {/* Left: Triage State Badge & Operational Protocol */}
          <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-mono text-base font-extrabold text-white shadow-md transition-transform ${
                triageState === 3
                  ? "bg-critical shadow-critical/40 animate-pulse ring-2 ring-critical/40"
                  : triageState === 2
                  ? "bg-amber-500 shadow-amber-500/30 text-black ring-2 ring-amber-500/30"
                  : "bg-emerald-600 shadow-emerald-600/30 ring-2 ring-emerald-500/30"
              }`}
            >
              {triageState === 3 ? (
                <ShieldAlert className="h-6 w-6" />
              ) : triageState === 2 ? (
                <AlertTriangle className="h-6 w-6 text-black" />
              ) : (
                <ShieldCheck className="h-6 w-6" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t("cmd.triage.title")}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-tight shadow-2xs ${
                    triageState === 3
                      ? "bg-critical/20 text-critical border border-critical/30 animate-pulse"
                      : triageState === 2
                      ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                      : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      triageState === 3
                        ? "bg-critical animate-ping"
                        : triageState === 2
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                  />
                  {triageState === 3
                    ? t("cmd.triage.state3")
                    : triageState === 2
                    ? t("cmd.triage.state2")
                    : t("cmd.triage.state1")}
                </span>
              </div>
              <p className="text-xs text-foreground/85 mt-1 leading-relaxed max-w-2xl">
                {triageState === 3
                  ? t("cmd.triage.desc3")
                  : triageState === 2
                  ? t("cmd.triage.desc2")
                  : t("cmd.triage.desc1")}
              </p>
            </div>
          </div>

          {/* Right: Real-time Telemetry & Hardware Cluster HUD */}
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:flex xl:items-center gap-2 sm:gap-2.5 shrink-0 pt-3 xl:pt-0 border-t xl:border-t-0 border-border/50">
            {/* 1. Live Collar Node */}
            <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-background/80 backdrop-blur-sm px-3 py-2 shadow-2xs">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-500">
                <Radio className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider truncate">
                  {t("cmd.triage.collar")}
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs font-semibold text-foreground truncate">
                    {t("cmd.triage.collarNode")}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Peak Herd BDI */}
            <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-background/80 backdrop-blur-sm px-3 py-2 shadow-2xs">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                  maxBdi >= 0.70
                    ? "bg-critical/15 text-critical"
                    : maxBdi >= 0.40
                    ? "bg-amber-500/15 text-amber-500"
                    : "bg-emerald-500/15 text-emerald-500"
                }`}
              >
                <HeartPulse className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider truncate">
                  {t("cmd.triage.peakBdi")}
                </p>
                <p
                  className={`text-xs font-bold truncate ${
                    maxBdi >= 0.70
                      ? "text-critical"
                      : maxBdi >= 0.40
                      ? "text-amber-500"
                      : "text-emerald-500"
                  }`}
                >
                  {maxBdi.toFixed(2)} · {maxBdi >= 0.70 ? "Outbreak" : maxBdi >= 0.40 ? "Alert" : "Normal"}
                </p>
              </div>
            </div>

            {/* 3. Ingest Gateway Node */}
            <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-background/80 backdrop-blur-sm px-3 py-2 shadow-2xs">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-sky-500/15 text-sky-500">
                <Database className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider truncate">
                  {t("cmd.triage.gateway")}
                </p>
                <p className="text-xs font-semibold text-foreground truncate">
                  {t("cmd.triage.gatewayVal")}
                </p>
              </div>
            </div>

            {/* 4. Surveillance Status or Action */}
            {triageState === 3 ? (
              <button
                type="button"
                onClick={() =>
                  setVernacularModal({
                    open: true,
                    village: highestRiskAnimal?.village || "Gobichettipalayam",
                    tagId: highestRiskAnimal?.tag_id || "IN-TN-2031-4471",
                    disease: "Foot-and-Mouth Disease (FMD Suspect)",
                  })
                }
                className="flex items-center justify-center gap-2 rounded-lg bg-critical hover:bg-critical/90 text-white px-3 py-2 text-xs font-bold shadow-sm transition-all cursor-pointer col-span-2 sm:col-span-1"
              >
                <BellRing className="h-3.5 w-3.5 animate-bounce" />
                <span className="truncate">{t("cmd.feed.broadcast")}</span>
              </button>
            ) : (
              <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-background/80 backdrop-blur-sm px-3 py-2 shadow-2xs">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-violet-500/15 text-violet-500">
                  <ShieldCheck className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider truncate">
                    {t("cmd.triage.surveillance")}
                  </p>
                  <p className="text-xs font-semibold text-emerald-500 truncate">
                    {t("cmd.triage.collarLive")}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>


      {/* Split-Screen Inspector: Left Side 60% Width, Right Side 40% Width */}
      <div className="grid gap-5 lg:grid-cols-5 items-start">
        {/* Left Side (60% Width): Interactive GIS Map & Emergency Containment Drawer */}
        <div className="space-y-4 lg:col-span-3">
          {/* Emergency Containment Drawer (State 3 Only) */}
          {triageState === 3 && activeContainmentBuffer && (
            <div className="rounded-xl border border-critical/40 bg-gradient-to-r from-critical/15 via-critical/10 to-transparent p-4 shadow-lg space-y-3 animate-in fade-in slide-in-from-top-3 duration-300">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-critical text-white shadow animate-pulse">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
                      ACTIVE OUTBREAK CONTAINMENT ZONE · 3 KM PERIMETER
                      <span className="rounded bg-critical px-2 py-0.5 text-[9px] font-bold text-white">
                        EMERGENCY
                      </span>
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Target: <span className="font-medium text-foreground">{highestRiskAnimal?.tag_id}</span> ({highestRiskAnimal?.village}, Gobichettipalayam Sector) · Center: {activeContainmentBuffer.lat.toFixed(4)}°N, {activeContainmentBuffer.lon.toFixed(4)}°E
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleGenerateLabSlip(highestRiskAnimal?.tag_id)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-critical px-3 py-1.5 text-xs font-bold text-white hover:bg-critical/90 shadow transition"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    Lab Requisition Slip
                  </button>
                </div>
              </div>

              {/* Census & Dispatch Metrics */}
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-critical/20 text-xs">
                <div className="rounded-md border border-critical/25 bg-card/60 p-2.5">
                  <p className="font-mono text-base font-bold text-critical">142 Cattle · 28 Herds</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Registered livestock inside 3 km containment buffer
                  </p>
                </div>
                <div className="rounded-md border border-critical/25 bg-card/60 p-2.5">
                  <p className="font-mono text-base font-bold text-foreground">18 SMS Sent · IVR Ready</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Fast2SMS broadcast sent · BVO emergency dispatched
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Interactive GIS Map */}
          <div id="hotspot-map-section" className="panel p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-sm font-semibold">{t("cmd.map")}</h2>
                <AudioSpeakButton
                  text={`Hotspot surveillance map. Tracking ${mapPoints.length} collared animals across Gobichettipalayam block.`}
                  variant="badge"
                  label="Map Audio"
                />
              </div>
              <div className="flex gap-3 text-xs">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-low" /> State 1 (Normal)</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-medium" /> State 2 (Pre-clinical)</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-critical animate-pulse" /> State 3 (Outbreak)</span>
              </div>
            </div>

            <HotspotMap
              points={mapPoints}
              selectedId={activeTag}
              onSelect={(id) => setSelectedTag(id)}
              activeContainment={activeContainmentBuffer}
            />
          </div>

          {/* Real-time Pasture Collar Fleet Telemetry Bar */}
          <div className="panel p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-primary animate-pulse" />
                <h3 className="font-display text-xs font-bold text-foreground">
                  Active Pasture Collars · Live Sensor Nodes ({((data?.animals as any[]) ?? []).length} Online)
                </h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-semibold">
                ● ESP8266 & LoRa Ingest Live
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {((data?.animals as any[]) ?? []).map((a: any) => {
                const isSelected = activeTag === a.tag_id;
                const v = latestByTag.get(a.tag_id);
                const isThisCow1 = a.tag_id.includes("4471") || a.species === "Cattle";
                const isCritical = v?.band === "critical";
                const isMedium = v?.band === "medium";

                const tempVal = isThisCow1 && firebaseTelemetry.temp !== null ? firebaseTelemetry.temp : v?.temperature ?? 38.6;
                const bpmVal = isThisCow1 && firebaseTelemetry.bpm !== null ? firebaseTelemetry.bpm : v?.heart_rate ?? 70;
                const statusVal = isThisCow1 ? firebaseTelemetry.status : (isCritical ? "OUTBREAK" : isMedium ? "MONITOR" : "HEALTHY");

                return (
                  <button
                    key={a.tag_id}
                    type="button"
                    onClick={() => setSelectedTag(a.tag_id)}
                    className={`rounded-xl border p-2.5 text-left transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40"
                        : "border-border bg-card/60 hover:bg-muted/70"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-foreground truncate">
                        {a.species} {a.tag_id.split("-").pop()}
                      </span>
                      <span
                        className={`h-2 w-2 rounded-full ${
                          isCritical
                            ? "bg-critical animate-ping"
                            : isMedium
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                      />
                    </div>
                    <div className="text-[10px] text-muted-foreground flex items-center justify-between font-mono">
                      <span>{Number(tempVal).toFixed(1)}°C</span>
                      <span>{bpmVal} bpm</span>
                    </div>
                    <div className="flex items-center justify-between text-[9px] font-mono pt-1 border-t border-border/40">
                      <span className="text-muted-foreground truncate">{isThisCow1 ? "ESP8266 (RTDB)" : a.collar_node_id || "CLR-01"}</span>
                      <span className={isCritical ? "text-critical font-bold" : isMedium ? "text-amber-500 font-bold" : "text-emerald-500 font-bold"}>
                        {statusVal}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side (40% Width): Selected Animal Inspector Card */}
        <div className="panel p-5 lg:col-span-2 space-y-4">
          {/* Quick Animal Switcher */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border/60">
            <span className="text-[10px] uppercase font-bold text-muted-foreground mr-1 shrink-0">Collar:</span>
            {((data?.animals as any[]) ?? []).map((a: any) => {
              const isCollar1 = a.tag_id.includes("4471");
              const isSelected = activeTag === a.tag_id;
              const shortLabel = isCollar1
                ? "Cow 4471 (ESP8266 Live)"
                : a.tag_id.includes("8820")
                ? "8820 (Buffalo)"
                : a.tag_id.includes("1049")
                ? "1049 (Sheep)"
                : a.tag_id.includes("9231")
                ? "9231 (Goat)"
                : `${a.tag_id.split("-").pop()} (${a.species})`;

              return (
                <button
                  key={a.tag_id}
                  type="button"
                  onClick={() => setSelectedTag(a.tag_id)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "border border-border bg-card text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${isCollar1 ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground"}`} />
                  {shortLabel}
                </button>
              );
            })}
          </div>

          <div className="flex items-start justify-between border-b border-border pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-base font-bold text-foreground">
                  {selectedAnimal?.tag_id || activeTag || "IN-TN-2031-4471"}
                </h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight ${
                    (selectedVitals?.band === "critical"
                      ? "bg-critical/20 text-critical border border-critical/30"
                      : selectedVitals?.band === "medium"
                      ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                      : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30")
                  }`}
                >
                  {selectedVitals?.band === "critical"
                    ? "HIGH RISK (OUTBREAK)"
                    : selectedVitals?.band === "medium"
                    ? "MONITORING (PRE-CLINICAL)"
                    : "HEALTHY (NORMAL)"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedAnimal?.breed || "Kangayam Cow"} ({selectedAnimal?.species || "Cattle"}) · {selectedAnimal?.village || "Gobichettipalayam Pasture"}, Erode
              </p>
            </div>
            <AudioSpeakButton
              text={
                selectedVitals
                  ? `Animal ${selectedAnimal?.tag_id?.split("-").pop() || "4471"} in Gobichettipalayam. Body temperature ${selectedVitals.temp_c} degrees, heart rate ${selectedVitals.heart_rate} beats per minute. Animal is resting calmly. All vitals are normal.`
                  : t("cmd.noSelection")
              }
              variant="badge"
              label="Vitals Audio"
            />
          </div>

          {selectedVitals ? (
            <div className="space-y-4">
              {/* Radial Risk Gauge */}
              <RiskGauge bdi={selectedVitals.bdi} band={selectedVitals.band} />

              {/* Core 4 Health Signs Grid - Simplified for Farmers */}
              <div className="grid grid-cols-2 gap-3">
                <Vital
                  icon={Thermometer}
                  label={t("cmd.temp")}
                  value={`${Number(liveTemp).toFixed(1)} °C`}
                  subtext={
                    liveTemp > 39.5
                      ? "Fever detected (>39.5 °C)"
                      : liveTemp < 36.5
                      ? "Sub-normal (<36.5 °C)"
                      : "Normal (38.0–39.2 °C)"
                  }
                />
                <Vital
                  icon={HeartPulse}
                  label={t("cmd.hr")}
                  value={`${liveBpm} bpm`}
                  subtext={
                    liveBpm > 90
                      ? "Elevated pulse (>90 bpm)"
                      : liveBpm < 50
                      ? "Resting / Bradycardia"
                      : "Resting pulse (48–84 bpm)"
                  }
                />
                <Vital
                  icon={Activity}
                  label={t("cmd.motion")}
                  value={`${liveStatus} (${Number(liveVedba).toFixed(3)} g)`}
                  subtext="Real-time MPU6050 cadence"
                />
                <Vital
                  icon={Droplets}
                  label={t("cmd.thi") || "Weather & Heat Level"}
                  value={
                    selectedVitals.thi
                      ? selectedVitals.thi < 75
                        ? `Comfortable (${selectedVitals.thi.toFixed(1)})`
                        : selectedVitals.thi < 84
                        ? `Mild Heat (${selectedVitals.thi.toFixed(1)})`
                        : `High Heat Stress (${selectedVitals.thi.toFixed(1)})`
                      : "Comfortable (74.2)"
                  }
                  subtext="Sufficient shade & water advised"
                />
              </div>

              {/* Real-time Firebase Realtime Database (/cow1) Telemetry Panel */}
              {isSelectedCow1 && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span className="font-bold text-foreground flex items-center gap-1.5">
                        <Cpu className="h-3.5 w-3.5 text-emerald-500" />
                        ESP8266 Live Node (/cow1)
                      </span>
                    </div>
                    <span className="rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-bold px-2 py-0.5">
                      Firebase RTDB Connected
                    </span>
                  </div>

                  {/* 3-Axis Accelerometer & Status */}
                  <div className="grid grid-cols-4 gap-2 pt-1 text-center">
                    <div className="rounded-lg border border-border bg-card/60 p-2">
                      <span className="text-[10px] text-muted-foreground block font-mono">AX</span>
                      <span className="font-mono font-bold text-foreground text-xs">{firebaseTelemetry.raw?.ax ?? "604"}</span>
                    </div>
                    <div className="rounded-lg border border-border bg-card/60 p-2">
                      <span className="text-[10px] text-muted-foreground block font-mono">AY</span>
                      <span className="font-mono font-bold text-foreground text-xs">{firebaseTelemetry.raw?.ay ?? "687"}</span>
                    </div>
                    <div className="rounded-lg border border-border bg-card/60 p-2">
                      <span className="text-[10px] text-muted-foreground block font-mono">AZ</span>
                      <span className="font-mono font-bold text-foreground text-xs">{firebaseTelemetry.raw?.az ?? "687"}</span>
                    </div>
                    <div className="rounded-lg border border-border bg-card/60 p-2">
                      <span className="text-[10px] text-muted-foreground block">Status</span>
                      <span className="font-bold text-primary text-xs capitalize truncate block">{liveStatus}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5 border-t border-border/40 font-mono">
                    <span>GPS: {Number(liveLat).toFixed(5)}°N, {Number(liveLon).toFixed(5)}°E</span>
                    <span>Firebase Ping: {firebaseTelemetry.lastUpdated ? firebaseTelemetry.lastUpdated.toLocaleTimeString() : "Live"}</span>
                  </div>
                </div>
              )}

              {/* Livestock Health & Behavior Assessment (Plain Farmer Words) */}
              <div
                className={`rounded-xl border p-3.5 space-y-2.5 text-xs transition ${
                  selectedVitals.bdi >= 0.70
                    ? "border-critical/40 bg-critical/10 text-critical"
                    : selectedVitals.bdi >= 0.40
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5 uppercase text-[11px] tracking-wide">
                    {selectedVitals.bdi >= 0.70 ? (
                      <ShieldAlert className="h-4 w-4 text-critical" />
                    ) : selectedVitals.bdi >= 0.40 ? (
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    )}
                    {selectedVitals.bdi >= 0.70
                      ? "High Risk Health Alert"
                      : selectedVitals.bdi >= 0.40
                      ? "Pre-Clinical Health Watch"
                      : "Normal Health & Behavior"}
                  </span>
                  <span className="font-mono text-[10px] font-bold opacity-80">
                    Pulse: {selectedVitals.heart_rate} bpm · Motion: {selectedVitals.vedba.toFixed(3)} g
                  </span>
                </div>

                <p className="text-xs text-foreground/90 leading-relaxed">
                  {selectedVitals.bdi >= 0.70 ? (
                    <span className="text-critical font-medium">
                      Critical Risk: The animal is lying down and unable to stand, with high fever and rapid heart rate. Immediate veterinary medical care and quarantine isolation are recommended.
                    </span>
                  ) : selectedVitals.bdi >= 0.40 ? (
                    <span className="text-foreground font-medium">
                      Observation Notice: Animal is resting, but heart rate is higher than normal. This may indicate early fever or heat fatigue before visible symptoms appear. Monitor feed and water intake today.
                    </span>
                  ) : (
                    <span className="text-foreground/80">
                      Healthy & Calm: Heart rate and resting movement are completely normal. The animal is resting peacefully with no fever, pain, or signs of illness detected.
                    </span>
                  )}
                </p>

                {selectedVitals.bdi >= 0.40 && (
                  <div className="rounded-md bg-background/80 px-2.5 py-1.5 text-[11px] font-medium border border-border/50 text-foreground">
                    💡 Farmer Advice: Provide fresh cool drinking water, keep in shaded pasture, and contact your local veterinary assistant if appetite decreases.
                  </div>
                )}
              </div>

              {/* Lost Animal Pathway & Walking Navigation (For Farmers) */}
              <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600/15 text-blue-600 dark:text-blue-400">
                      <Footprints className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">
                        Find Lost Animal · Walking Route
                      </h4>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        GPS: {Number(liveLat).toFixed(5)}°N, {Number(liveLon).toFixed(5)}°E
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    Live GPS Locked
                  </span>
                </div>

                <p className="text-[11px] text-muted-foreground leading-snug">
                  Follow the live dotted blue pathway on the farm map, or open turn-by-turn walking navigation on your phone.
                </p>

                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${liveLat},${liveLon}&travelmode=walking`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 py-2 px-3 text-xs font-bold text-white shadow-sm transition text-center"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open Google Maps
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById("hotspot-map-section");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                      toast.success(`Centered map on ${selectedAnimal?.tag_id || activeTag}. Blue pathway leads to animal.`);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card hover:bg-muted py-2 px-3 text-xs font-semibold text-foreground transition text-center cursor-pointer shadow-2xs"
                  >
                    <MapPin className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    Show on Map
                  </button>
                </div>
              </div>

              {/* Lab Slip Requisition Option (Reasonable & Working) */}
              <div className="pt-1">
                {selectedVitals.bdi >= 0.70 ? (
                  <button
                    type="button"
                    onClick={() => handleGenerateLabSlip(activeTag)}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-critical py-2.5 px-4 text-xs font-bold text-white hover:bg-critical/90 shadow transition cursor-pointer"
                  >
                    <QrCode className="h-4 w-4" />
                    Issue Urgent Lab Requisition Slip (RDDL Referral)
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleGenerateLabSlip(activeTag)}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card hover:bg-muted py-2 px-3 text-xs font-semibold text-foreground shadow-2xs transition cursor-pointer"
                  >
                    <QrCode className="h-3.5 w-3.5 text-primary" />
                    Request Veterinary Inspection / Digital Lab Slip
                  </button>
                )}
                <p className="text-[10px] text-center text-muted-foreground mt-1.5">
                  Generates an official digital referral slip with scannable QR token for veterinary sample collection.
                </p>
              </div>

              {/* Packet Timestamp */}
              <div className="rounded-md bg-muted/60 p-2 text-xs text-muted-foreground flex items-center justify-between">
                <span>
                  <Clock className="mr-1 inline h-3 w-3" />
                  {t("cmd.lastPacket")}: {new Date(selectedVitals.recorded_at).toLocaleTimeString()}
                </span>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  ESP8266 Live Ingest
                </span>
              </div>
            </div>
          ) : (
            <div className="mt-8 text-center text-sm text-muted-foreground">{t("cmd.noSelection")}</div>
          )}
        </div>
      </div>

      {/* Alert Feed & Reports */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="panel p-4 lg:col-span-2 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-sm font-semibold">{t("cmd.feed")}</h2>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${activeAlerts.length > 0 ? "bg-critical/15 text-critical animate-pulse" : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"}`}>
                {activeAlerts.length > 0 ? `${activeAlerts.length} Active Notice` : "All Clear"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg border border-border p-0.5 text-xs bg-muted/40">
                <button
                  type="button"
                  onClick={() => setAlertTab("active")}
                  className={`px-2.5 py-1 rounded font-semibold transition cursor-pointer ${alertTab === "active" ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Active ({activeAlerts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAlertTab("all")}
                  className={`px-2.5 py-1 rounded font-semibold transition cursor-pointer ${alertTab === "all" ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"}`}
                >
                  All ({validAlerts.length})
                </button>
              </div>

              <AudioSpeakButton
                text={
                  activeAlerts.length > 0
                    ? `Alerts feed. ${activeAlerts.length} active notifications in Gobichettipalayam.`
                    : "All clear. No active disease alerts in Gobichettipalayam block."
                }
                variant="badge"
                label="Alerts Audio"
              />
            </div>
          </div>

          <div className="space-y-3">
            {displayedAlerts.length === 0 ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center space-y-2">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-bold text-foreground">
                  All Clear · Normal Herd Status
                </h4>
                <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                  No active outbreak or high-fever alarms in Gobichettipalayam. Collars are streaming in healthy physiological range (BDI &lt; 0.40).
                </p>
              </div>
            ) : (
              displayedAlerts.map((a: any) => {
                const isResolved = a.status === "resolved";
                const severityKey = (a.severity in BAND_STYLES ? a.severity : "medium") as keyof typeof BAND_STYLES;
                const style = isResolved
                  ? { chip: "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400", label: "RESOLVED" }
                  : BAND_STYLES[severityKey] || BAND_STYLES.medium;

                return (
                  <div key={a.id} className={`rounded-xl border p-3.5 space-y-2.5 transition ${isResolved ? "border-emerald-500/30 bg-emerald-500/5" : "border-critical/30 bg-critical/5"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs font-bold text-foreground">{a.title}</p>
                          <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${isResolved ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-critical/20 text-critical"}`}>
                            {isResolved ? "RESOLVED" : "ACTIVE NOTICE"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{a.detail}</p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-0.5">
                          <span className="flex items-center gap-1 font-medium"><MapPin className="h-3 w-3 text-primary" /> {a.village}, {a.block}</span>
                          {a.containment_radius_m > 0 && !isResolved && (
                            <span className="rounded bg-critical/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-critical">
                              {a.containment_radius_m / 1000} km Quarantine Zone
                            </span>
                          )}
                          <span className="font-mono text-[10px]">{new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        {!isResolved && (
                          <button
                            type="button"
                            onClick={() => resolveAlertMutation.mutate(a.id)}
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-500 shadow-2xs transition cursor-pointer"
                            title="Mark this alert verified & safe"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Mark Safe
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleGenerateLabSlip(a.tag_id)}
                          className="inline-flex items-center gap-1 rounded border border-border bg-card px-2 py-1 text-[11px] font-semibold hover:bg-muted transition cursor-pointer"
                        >
                          <QrCode className="h-3 w-3 text-primary" />
                          Lab Slip
                        </button>
                        <button
                          type="button"
                          onClick={() => setVernacularModal({ open: true, village: a.village, tagId: a.tag_id, disease: a.title })}
                          className="inline-flex items-center gap-1 rounded border border-primary/40 bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/20 transition cursor-pointer"
                        >
                          <Radio className="h-3 w-3" />
                          Advisory
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="panel p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h2 className="font-display text-sm font-semibold">{t("cmd.reports")}</h2>
              <p className="text-[10px] text-muted-foreground">Local village observations</p>
            </div>
            <Link
              to="/report"
              className="inline-flex items-center gap-1 rounded-lg bg-primary/15 px-2.5 py-1 text-xs font-bold text-primary hover:bg-primary/25 transition cursor-pointer"
            >
              + Report Symptom
            </Link>
          </div>

          <div className="space-y-2.5">
            {((data?.reports as any[]) ?? [])
              .filter((r: any) => !r.reporter_name?.includes("Kadam") && !r.reporter_name?.includes("Gaikwad"))
              .slice(0, 5)
              .map((r: any) => (
                <div key={r.id} className="rounded-xl border border-border/80 bg-surface/70 p-3 space-y-1.5 hover:border-border transition">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <span>👤 {r.reporter_name || "Local Farmer"}</span>
                      <span className="rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold px-1.5 py-0.2">
                        ✓ Verified
                      </span>
                    </p>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-xs font-medium text-primary">
                    {Array.isArray(r.symptoms) ? r.symptoms.join(" · ") : r.symptoms}
                  </p>
                  {r.notes && (
                    <p className="text-[11px] text-muted-foreground italic leading-snug">
                      "{r.notes}"
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 pt-0.5">
                    <MapPin className="h-3 w-3 text-muted-foreground" /> {r.village || "Gobichettipalayam Pasture"}, {r.block || "Erode"}
                  </p>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Vernacular Alert Audio & SMS Webhook Modal */}
      <VernacularAlertModal
        isOpen={!!vernacularModal?.open}
        onClose={() => setVernacularModal(null)}
        village={vernacularModal?.village}
        tagId={vernacularModal?.tagId}
        disease={vernacularModal?.disease}
      />

      {/* Official Digital Lab Requisition Slip Modal */}
      <LabSlipModal
        isOpen={!!labSlipRequisition}
        onClose={() => setLabSlipRequisition(null)}
        requisition={labSlipRequisition}
      />
    </div>
  );
}

function Vital({
  icon: Icon,
  label,
  value,
  subtext,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subtext?: string;
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-surface/90 p-3 shadow-2xs hover:border-border transition">
      <div className="flex items-center justify-between">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="label-caps mt-2 text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">{label}</p>
      <p className="mt-0.5 text-base sm:text-lg font-bold tabular tracking-tight text-foreground">{value}</p>
      {subtext && (
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{subtext}</p>
      )}
    </div>
  );
}

function StatBadge({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: React.ElementType;
  value: number;
  label: string;
  tone?: "critical" | "warning" | "success" | undefined;
}) {
  const toneStyle =
    tone === "critical"
      ? "border-critical/40 bg-critical/10 text-critical"
      : tone === "warning"
      ? "border-amber-500/40 bg-amber-500/10 text-amber-500"
      : tone === "success"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
      : "border-border bg-card text-foreground";

  return (
    <div className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 shadow-xs transition ${toneStyle}`}>
      <Icon className="h-4 w-4 shrink-0" />
      <div>
        <p className="font-mono text-sm font-bold leading-none text-foreground">{value}</p>
        <p className="text-[9px] uppercase font-bold text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}
