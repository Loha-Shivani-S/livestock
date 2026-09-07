import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCommandData, ingestTelemetry, recordGatewayHeartbeat, getIngestConfig } from "@/lib/data-client";
import { useI18n } from "@/lib/i18n";
import { Wifi, WifiOff, Radio, Send, Copy, KeyRound, Check, Activity, Battery, Signal, RefreshCw, Zap, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { AudioSpeakButton } from "@/components/AudioSpeakButton";

export const Route = createFileRoute("/_authenticated/devices")({
  component: DevicesPage,
  head: () => ({
    meta: [
      { title: "Collars & gateways — PashuRakshak" },
      { name: "description", content: "LoRa collar nodes and village gateway status for the PashuRakshak network." },
    ],
  }),
});

function DevicesPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["command"], queryFn: () => getCommandData(), refetchInterval: 10000 });
  const { data: ingestConfig } = useQuery({ queryKey: ["ingest-config"], queryFn: () => getIngestConfig() });
  const [copied, setCopied] = useState(false);

  // Telemetry simulation states
  const [tag, setTag] = useState("IN-MH-2031-4471");
  const [temp, setTemp] = useState(40.8);
  const [hr, setHr] = useState(96);
  const [selectedNode, setSelectedNode] = useState("GW-02");

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const ingestUrl = `${origin}/api/public/ingest`;
  const heartbeatUrl = `${origin}/api/public/gateway-heartbeat`;

  const copy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(`${label} copied`);
    setTimeout(() => setCopied(false), 2000);
  };

  const simulate = useMutation({
    mutationFn: ingestTelemetry,
    onSuccess: (res) => {
      toast.success(`${t("dev.sent")} BDI ${res.bdi.toFixed(3)} · Band: ${res.band.toUpperCase()}`);
      qc.invalidateQueries({ queryKey: ["command"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const heartbeatMutation = useMutation({
    mutationFn: recordGatewayHeartbeat,
    onSuccess: (res) => {
      toast.success(`Gateway ${res.node_id} heartbeat recorded! Status: ONLINE`);
      qc.invalidateQueries({ queryKey: ["command"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const sendTest = () => {
    simulate.mutate({
      node_id: selectedNode,
      tag_id: tag,
      temp,
      heart_rate: hr,
      ax: 0.04,
      ay: 0.02,
      az: 0.98,
      lat: 20.2014,
      lon: 73.8341,
      speed: 0.2,
      thi: 81.5,
    });
  };

  const pingGateway = (nodeId: string) => {
    heartbeatMutation.mutate({
      node_id: nodeId,
      online: true,
      queued: 0,
      rssi: -65 - Math.floor(Math.random() * 15),
      snr: 9.2,
      battery_pct: 95,
      firmware_v: "1.2.0-esp32",
    });
  };

  const applyPreset = (type: "fever" | "healthy" | "mastitis") => {
    if (type === "fever") {
      setTemp(41.4);
      setHr(104);
      toast.info("Applied Acute FMD Fever Preset (Critical BDI)");
    } else if (type === "healthy") {
      setTemp(38.5);
      setHr(64);
      toast.info("Applied Healthy Baseline Preset (Low BDI)");
    } else if (type === "mastitis") {
      setTemp(39.8);
      setHr(84);
      toast.info("Applied Sub-clinical Mastitis Preset (Medium BDI)");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("dev.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("dev.lede")}</p>
        </div>
        <div className="flex items-center gap-2">
          <AudioSpeakButton
            text="Collars and gateways surveillance network. LoRa collar sensor nodes stream vitals through village gateways."
            variant="outline"
            label="Network Overview"
          />
          <span className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold">
            <Radio className="h-4 w-4 text-primary animate-pulse" />
            LoRa 433/868 MHz Mesh Active
          </span>
        </div>
      </div>

      {/* Gateway Status Cards with Live Heartbeat */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-sm font-semibold">Village Gateway Nodes & Heartbeat Health</h2>
            <AudioSpeakButton
              text={`Village gateways health status. ${data?.gateways?.filter((g: any) => g.online).length ?? 0} gateways online out of ${data?.gateways?.length ?? 0} active receivers.`}
              variant="badge"
              label="Gateways Audio"
            />
          </div>
          <span className="text-xs text-muted-foreground">Auto-refreshes every 10 seconds</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(data?.gateways ?? []).map((g: any) => {
            const isOnline = g.online;
            const isDegraded = g.degraded;
            const ageMins = g.ageSeconds ? Math.floor(g.ageSeconds / 60) : 0;

            return (
              <div
                key={g.id}
                className={`panel p-4 transition-all ${
                  isOnline
                    ? "border-low/40 shadow-sm"
                    : isDegraded
                    ? "border-medium/40"
                    : "border-critical/30 opacity-80"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary">
                    <Radio className="h-5 w-5 text-secondary-foreground" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isOnline ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-low-soft px-2 py-0.5 text-[10px] font-bold text-low">
                        <span className="h-1.5 w-1.5 rounded-full bg-low animate-ping" />
                        ONLINE
                      </span>
                    ) : isDegraded ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-medium-soft px-2 py-0.5 text-[10px] font-bold text-medium">
                        DEGRADED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-critical-soft px-2 py-0.5 text-[10px] font-bold text-critical">
                        OFFLINE
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex items-baseline justify-between">
                    <p className="font-semibold text-sm">{g.label}</p>
                    <span className="font-mono text-[11px] font-bold text-primary">{g.node_id}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{g.village}, {g.block}</p>
                </div>

                {/* Gateway telemetry metrics */}
                <div className="mt-3 grid grid-cols-3 gap-1 rounded-md bg-surface p-2 text-[10px] text-muted-foreground border border-border">
                  <div className="flex items-center gap-1">
                    <Signal className="h-3 w-3 text-primary" />
                    <span>{g.rssi ? `${g.rssi} dBm` : "-72 dBm"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Battery className="h-3 w-3 text-low" />
                    <span>{g.battery_pct !== undefined ? `${g.battery_pct}%` : "100%"}</span>
                  </div>
                  <div>
                    <span className="font-mono font-semibold text-foreground">{g.queued ?? 0}</span> queued
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between pt-1 border-t border-border">
                  <p className="text-[10px] text-muted-foreground">
                    {isOnline && g.ageSeconds < 60
                      ? "Pinged just now"
                      : `Last seen: ${ageMins > 0 ? `${ageMins}m ago` : "recently"}`}
                  </p>
                  <button
                    type="button"
                    onClick={() => pingGateway(g.node_id)}
                    disabled={heartbeatMutation.isPending}
                    className="inline-flex items-center gap-1 rounded border border-border bg-card px-2 py-0.5 text-[10px] font-semibold text-primary hover:bg-accent disabled:opacity-50"
                  >
                    <RefreshCw className="h-2.5 w-2.5" />
                    Ping Heartbeat
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Firmware & Gateway Ingestion Endpoints */}
      <div className="panel p-5 space-y-4">
        <h2 className="font-display text-sm font-semibold">{t("dev.endpoint")}</h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="label-caps mb-1">LoRa Telemetry Uplink URL</p>
            <div className="flex items-center gap-2 rounded-md bg-muted p-2.5">
              <code className="flex-1 truncate text-xs font-mono">{ingestUrl}</code>
              <button
                type="button"
                onClick={() => copy(ingestUrl, "Ingest URL")}
                className="shrink-0 rounded border border-input bg-card p-1.5 hover:bg-accent"
                aria-label="Copy ingest URL"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          <div>
            <p className="label-caps mb-1">Gateway Heartbeat URL (ESP32 Firmware)</p>
            <div className="flex items-center gap-2 rounded-md bg-muted p-2.5">
              <code className="flex-1 truncate text-xs font-mono">{heartbeatUrl}</code>
              <button
                type="button"
                onClick={() => copy(heartbeatUrl, "Heartbeat URL")}
                className="shrink-0 rounded border border-input bg-card p-1.5 hover:bg-accent"
                aria-label="Copy heartbeat URL"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-md border border-border bg-surface p-3">
          <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="label-caps">Device Security Key (x-device-key header)</p>
            <div className="mt-1 flex items-center gap-2">
              <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-xs font-mono">
                {ingestConfig?.deviceKey || "PR-SEC-LORA-2026"}
              </code>
              <button
                type="button"
                onClick={() => copy(ingestConfig?.deviceKey || "PR-SEC-LORA-2026", "Device key")}
                className="shrink-0 rounded border border-input bg-card p-1.5 hover:bg-accent"
                aria-label="Copy device key"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Configured in <code className="font-mono font-semibold">firmware/gateway_node/gateway_node.ino</code> line 24.
            </p>
          </div>
        </div>
      </div>

      {/* Collar Telemetry Simulator with Clinical Presets */}
      <div className="panel p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-sm font-semibold">Live LoRa Collar Telemetry Simulator</h2>
              <AudioSpeakButton
                text="Live LoRa collar telemetry simulator. Test transmission from collar nodes to evaluate real-time BDI analytics, fever detection, and outbreak containment."
                variant="badge"
                label="Sim Audio"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Simulate sensor transmission from collar transmitter nodes to evaluate real-time BDI analytics and alerts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground mr-1">Presets:</span>
            <button
              type="button"
              onClick={() => applyPreset("healthy")}
              className="rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium hover:border-low hover:text-low"
            >
              Healthy
            </button>
            <button
              type="button"
              onClick={() => applyPreset("mastitis")}
              className="rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium hover:border-medium hover:text-medium"
            >
              Mastitis Spike
            </button>
            <button
              type="button"
              onClick={() => applyPreset("fever")}
              className="rounded-md border border-critical/40 bg-critical/10 px-2.5 py-1 text-xs font-bold text-critical hover:bg-critical/20"
            >
              Acute FMD Fever
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-5">
          <div>
            <label className="label-caps block">Receiver Gateway</label>
            <select
              value={selectedNode}
              onChange={(e) => setSelectedNode(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-card px-2 py-1.5 text-sm"
            >
              <option value="GW-01">GW-01 (Dindori)</option>
              <option value="GW-02">GW-02 (Vani)</option>
              <option value="GW-03">GW-03 (Nanashi)</option>
              <option value="GW-04">GW-04 (Khedgaon)</option>
            </select>
          </div>

          <div>
            <label className="label-caps block">Animal Tag ID</label>
            <input
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-card px-2 py-1.5 text-sm"
            />
          </div>

          <div>
            <label className="label-caps block">Body Temp (°C)</label>
            <input
              type="number"
              step={0.1}
              value={temp}
              onChange={(e) => setTemp(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-input bg-card px-2 py-1.5 text-sm font-semibold"
            />
          </div>

          <div>
            <label className="label-caps block">Heart Rate (BPM)</label>
            <input
              type="number"
              value={hr}
              onChange={(e) => setHr(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-input bg-card px-2 py-1.5 text-sm font-semibold"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={sendTest}
              disabled={simulate.isPending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              {simulate.isPending ? "Transmitting..." : t("dev.simulate")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
