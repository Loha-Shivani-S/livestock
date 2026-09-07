import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { submitFieldReport } from "@/lib/data-client";
import { useI18n } from "@/lib/i18n";
import { SymptomTiles } from "@/components/SymptomTiles";
import { VoiceButton } from "@/components/VoiceButton";
import { AudioSpeakButton } from "@/components/AudioSpeakButton";
import { useOfflineQueue, enqueueReport } from "@/lib/offline-queue";
import { toast } from "sonner";
import { Minus, Plus, WifiOff, RefreshCw, CheckCircle2, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_authenticated/report")({
  component: ReportPage,
  head: () => ({
    meta: [
      { title: "Field report — HerdSentinel" },
      { name: "description", content: "Report a sick animal using pictures or voice in your own language, with offline queuing support." },
    ],
  }),
});

function ReportPage() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const { isOnline, pendingCount, isSyncing, syncNow, refreshQueue, storageEngine } = useOfflineQueue();

  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [affected, setAffected] = useState(1);
  const [deaths, setDeaths] = useState(0);
  const [village, setVillage] = useState("");
  const [tag, setTag] = useState("");
  const [species, setSpecies] = useState("Cattle");
  const [notes, setNotes] = useState("");
  const [voice, setVoice] = useState("");

  const resetForm = () => {
    setSymptoms([]);
    setAffected(1);
    setDeaths(0);
    setNotes("");
    setVoice("");
  };

  const mutation = useMutation({
    mutationFn: submitFieldReport,
    onSuccess: () => {
      toast.success(t("report.sent"));
      resetForm();
      qc.invalidateQueries({ queryKey: ["command"] });
    },
    onError: (err: Error) => {
      // If network submission fails, automatically save to offline queue
      enqueueReport({
        tag_id: tag || undefined,
        species,
        affected_count: affected,
        mortality_count: deaths,
        symptoms,
        notes,
        voice_transcript: voice,
        language: lang,
        village: village || "Unknown",
        channel: "offline_pwa",
      });
      refreshQueue();
      toast.warning(t("report.offline"));
      resetForm();
    },
  });

  const toggleSymptom = (label: string) => {
    setSymptoms((prev) => (prev.includes(label) ? prev.filter((s) => s !== label) : [...prev, label]));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (symptoms.length === 0 && !notes && !voice) {
      toast.error(t("report.needSymptom"));
      return;
    }

    if (!isOnline) {
      enqueueReport({
        tag_id: tag || undefined,
        species,
        affected_count: affected,
        mortality_count: deaths,
        symptoms,
        notes,
        voice_transcript: voice,
        language: lang,
        village: village || "Unknown",
        channel: "offline_pwa",
      });
      refreshQueue();
      toast.info(t("report.offline"));
      resetForm();
      return;
    }

    mutation.mutate({
      ...(tag ? { tag_id: tag } : {}),
      species,
      affected_count: affected,
      mortality_count: deaths,
      symptoms,
      notes,
      voice_transcript: voice,
      language: lang,
      village: village || "Unknown",
      channel: "mobile",
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Offline Status & Pending Queue Banner */}
      {!isOnline && (
        <div className="flex items-center gap-3 rounded-lg border border-critical/40 bg-critical-soft p-4 text-critical">
          <WifiOff className="h-5 w-5 shrink-0 animate-pulse" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold">
                {lang === "hi" ? "ऑफलाइन फील्ड मोड सक्रिय" : lang === "mr" ? "ऑफलाइन फील्ड मोड सक्रिय" : "Offline Field Mode Active"}
              </p>
              <span className="rounded bg-critical/20 px-2 py-0.5 text-[10px] font-mono font-semibold uppercase">
                {storageEngine} Secure Storage
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {lang === "hi"
                ? "इंटरनेट कनेक्शन उपलब्ध नहीं है। रिपोर्ट इस डिवाइस में सुरक्षित रहेगी और नेटवर्क आते ही अपने आप भेज दी जाएगी।"
                : lang === "mr"
                ? "इंटरनेट कनेक्शन उपलब्ध नाही. अहवाल या फोनमध्ये सुरक्षित राहील व नेटवर्क येताच पाठवला जाईल."
                : "Low-connectivity area detected. Submissions serialize directly into browser IndexedDB and auto-flush when cellular connection resumes."}
            </p>
          </div>
        </div>
      )}

      {pendingCount > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-medium/40 bg-medium-soft p-3.5 text-medium">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span className="text-xs font-semibold">
              {pendingCount} {lang === "hi" ? "रिपोर्ट IndexedDB कतार में सुरक्षित हैं" : lang === "mr" ? "अहवाल IndexedDB रांगेत सुरक्षित आहेत" : `report(s) queued in browser ${storageEngine}`}
            </span>
          </div>
          <button
            type="button"
            onClick={syncNow}
            disabled={isSyncing || !isOnline}
            className="inline-flex items-center gap-1.5 rounded-md bg-medium px-3 py-1 text-xs font-bold text-black hover:bg-medium/90 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Flushing to Cloud..." : lang === "hi" ? "अभी सिंक करें" : lang === "mr" ? "आता सिंक करा" : "Sync Now"}
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("report.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("report.lede")}</p>
        </div>
        <AudioSpeakButton
          text={`${t("report.title")}. ${t("report.lede")}`}
          variant="outline"
        />
      </div>

      <form onSubmit={submit} className="space-y-6">
        <section className="panel p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="font-display text-sm font-semibold">{t("report.step1")}</h2>
            <AudioSpeakButton
              text={t("report.sec1.speech")}
              variant="badge"
              label={lang === "hi" ? "चरण 1 सुनें" : lang === "mr" ? "पायरी १ ऐका" : "Hear Step 1"}
            />
          </div>
          <div>
            <SymptomTiles selected={symptoms} onToggle={toggleSymptom} />
          </div>
        </section>

        <section className="panel p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="font-display text-sm font-semibold">{t("report.step2")}</h2>
            <AudioSpeakButton
              text={t("report.sec2.speech")}
              variant="badge"
              label={lang === "hi" ? "चरण 2 सुनें" : lang === "mr" ? "पायरी २ ऐका" : "Hear Step 2"}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Counter label={t("report.affected")} value={affected} onChange={setAffected} min={1} />
            <Counter label={t("report.deaths")} value={deaths} onChange={setDeaths} min={0} />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label-caps mb-1.5 block">{t("report.village")}</label>
              <input
                required
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                placeholder="e.g. Dindori, Nanashi, Vani"
                className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="label-caps mb-1.5 block">{t("report.tag")}</label>
              <input
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="IN-MH-2031-4471"
                className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="label-caps mb-1.5 block">{t("report.species")}</label>
              <select
                value={species}
                onChange={(e) => setSpecies(e.target.value)}
                className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="Cattle">{lang === "hi" ? "गाय / बैल (Cattle)" : lang === "mr" ? "गाय / बैल (Cattle)" : "Cattle"}</option>
                <option value="Buffalo">{lang === "hi" ? "भैंस (Buffalo)" : lang === "mr" ? "म्हैस (Buffalo)" : "Buffalo"}</option>
                <option value="Goat">{lang === "hi" ? "बकरी (Goat)" : lang === "mr" ? "शेळी (Goat)" : "Goat"}</option>
                <option value="Sheep">{lang === "hi" ? "भेड़ (Sheep)" : lang === "mr" ? "मेंढी (Sheep)" : "Sheep"}</option>
                <option value="Pig">{lang === "hi" ? "सूअर (Pig)" : lang === "mr" ? "डुक्कर (Pig)" : "Pig"}</option>
              </select>
            </div>
          </div>
        </section>

        <section className="panel p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="font-display text-sm font-semibold">{t("report.step3")}</h2>
            <AudioSpeakButton
              text={t("report.sec3.speech")}
              variant="badge"
              label={lang === "hi" ? "चरण 3 सुनें" : lang === "mr" ? "पायरी ३ ऐका" : "Hear Step 3"}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <VoiceButton onTranscript={(text) => setVoice((prev) => (prev ? prev + " " + text : text))} />
            {voice && (
              <div className="flex items-center gap-2 rounded-md bg-surface border border-border px-3 py-1.5">
                <p className="text-sm text-muted-foreground italic">“{voice}”</p>
                <AudioSpeakButton text={voice} variant="icon" />
              </div>
            )}
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1.5">
              <label className="label-caps block">{t("report.notes")}</label>
              {notes && <AudioSpeakButton text={notes} variant="badge" label="Read aloud" />}
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. High drooling, sores on hooves, refused grazing..."
              rows={3}
              className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </section>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {mutation.isPending ? t("report.sending") : !isOnline ? "Save to Offline Queue" : t("report.submit")}
        </button>
      </form>
    </div>
  );
}

function Counter({ label, value, onChange, min }: { label: string; value: number; onChange: (n: number) => void; min: number }) {
  return (
    <div className="rounded-md border border-border bg-surface p-3">
      <label className="label-caps block">{label}</label>
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="rounded-md border border-input bg-card p-1 hover:bg-accent"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-8 text-center text-lg font-semibold tabular">{value}</span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="rounded-md border border-input bg-card p-1 hover:bg-accent"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
