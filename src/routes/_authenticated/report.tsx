import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { submitFieldReport } from "@/lib/data-client";
import { useI18n } from "@/lib/i18n";
import { SymptomTiles } from "@/components/SymptomTiles";
import { VoiceButton } from "@/components/VoiceButton";
import { AudioSpeakButton } from "@/components/AudioSpeakButton";
import { useOfflineQueue, enqueueReport } from "@/lib/offline-queue";
import { toast } from "sonner";
import {
  Minus,
  Plus,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  ShieldAlert,
  MapPin,
  Tag,
  Mail,
  Smartphone,
  Share2,
  ExternalLink,
  Sparkles,
  ClipboardList,
  UserCheck,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/report")({
  component: ReportPage,
  head: () => ({
    meta: [
      { title: "Field report — HerdSentinel" },
      { name: "description", content: "Report a sick animal using pictures or voice in your own language, with offline queuing support." },
    ],
  }),
});

const POPULAR_VILLAGES = [
  "Gobichettipalayam Pasture",
  "Kullampalayam",
  "Modachur",
  "Nambiyur",
  "Lakkampatti",
  "Alukuli",
];

export function ReportPage() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const { isOnline, pendingCount, isSyncing, syncNow, refreshQueue, storageEngine } = useOfflineQueue();

  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [affected, setAffected] = useState(1);
  const [deaths, setDeaths] = useState(0);
  const [village, setVillage] = useState("Gobichettipalayam Pasture");
  const [tag, setTag] = useState("");
  const [species, setSpecies] = useState("Goat");
  const [notes, setNotes] = useState("");
  const [voice, setVoice] = useState("");

  // Reporter & Email settings
  const [reporterName, setReporterName] = useState("Loha Shivani");
  const [reporterPhone, setReporterPhone] = useState("+91 82706 503379");
  const [reporterEmail, setReporterEmail] = useState("lohashivani360@gmail.com");
  const [sendEmailCopy, setSendEmailCopy] = useState(true);

  // Success modal
  const [submittedReport, setSubmittedReport] = useState<any | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedPhone = localStorage.getItem("herdsentinel_user_phone");
      const savedEmail = localStorage.getItem("herdsentinel_user_email");
      const savedName = localStorage.getItem("herdsentinel_reporter_name");
      if (savedPhone) setReporterPhone(savedPhone);
      if (savedEmail) setReporterEmail(savedEmail);
      if (savedName) setReporterName(savedName);
    }
  }, []);

  const resetForm = () => {
    setSymptoms([]);
    setAffected(1);
    setDeaths(0);
    setNotes("");
    setVoice("");
  };

  const mutation = useMutation({
    mutationFn: submitFieldReport,
    onSuccess: (data: any) => {
      toast.success(t("report.sent"));
      if (typeof window !== "undefined") {
        localStorage.setItem("herdsentinel_user_phone", reporterPhone);
        localStorage.setItem("herdsentinel_user_email", reporterEmail);
        localStorage.setItem("herdsentinel_reporter_name", reporterName);
      }
      setSubmittedReport(data);
      resetForm();
      qc.invalidateQueries({ queryKey: ["command"] });
    },
    onError: (err: Error) => {
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

  const handleGpsAutofill = () => {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      toast.loading("Detecting pasture GPS...", { id: "gps-toast" });
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          toast.success("Location acquired: Gobichettipalayam Sector", { id: "gps-toast" });
          setVillage("Gobichettipalayam Pasture");
        },
        () => {
          toast.info("Using default pasture: Gobichettipalayam", { id: "gps-toast" });
          setVillage("Gobichettipalayam Pasture");
        },
        { timeout: 4000 }
      );
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (symptoms.length === 0 && !notes && !voice) {
      toast.error(t("report.needSymptom"));
      return;
    }

    const payload = {
      ...(tag ? { tag_id: tag } : {}),
      species,
      affected_count: affected,
      mortality_count: deaths,
      symptoms,
      notes,
      voice_transcript: voice,
      language: lang,
      village: village || "Gobichettipalayam Pasture",
      channel: "mobile",
      reporter_name: reporterName,
      reporter_phone: reporterPhone,
      reporter_email: reporterEmail,
      send_email_copy: sendEmailCopy,
      lat: 11.4533,
      lon: 77.4337,
    };

    if (!isOnline) {
      enqueueReport(payload as any);
      refreshQueue();
      toast.info(t("report.offline"));
      resetForm();
      return;
    }

    mutation.mutate(payload);
  };

  // Gmail mailto compose URL
  const targetEmail = reporterEmail.trim() || "lohashivani360@gmail.com";
  const emailSubject = `[CLINICAL FIELD REPORT] ${species} Disease Case — ${village}`;
  const emailBodyText = [
    `HERDSENTINEL VETERINARY FIELD CLINICAL REPORT`,
    `===============================================`,
    `Case Species: ${species}`,
    `Symptoms Observed: ${symptoms.length ? symptoms.join(", ") : "None specified"}`,
    `Number Affected: ${affected}`,
    `Mortality / Deaths: ${deaths}`,
    `Ear Tag ID: ${tag || "Unregistered / Visual herd inspection"}`,
    `Village / Pasture: ${village}, Gobichettipalayam, Erode`,
    `Reporter: ${reporterName} (${reporterPhone})`,
    `Notes: ${notes || "None"}`,
    `Voice Transcript: ${voice || "None"}`,
    `Timestamp: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`,
    ``,
    `Helpline: 1962 (Toll-Free Pashu Chikitsalaya)`,
  ].join("\n");

  const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
    targetEmail
  )}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBodyText)}`;

  const whatsappShareUrl = `https://wa.me/9182706503379?text=${encodeURIComponent(
    `🚨 *HerdSentinel Field Report*\nAnimal: ${species}\nSymptoms: ${symptoms.join(
      ", "
    )}\nAffected: ${affected} (Deaths: ${deaths})\nVillage: ${village}\nReporter: ${reporterName}`
  )}`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Offline Status & Pending Queue Banner */}
      {!isOnline && (
        <div className="flex items-center gap-3 rounded-lg border border-critical/40 bg-critical-soft p-4 text-critical">
          <WifiOff className="h-5 w-5 shrink-0 animate-pulse" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold">Offline Field Mode Active</p>
              <span className="rounded bg-critical/20 px-2 py-0.5 text-[10px] font-mono font-semibold uppercase">
                {storageEngine} Secure Storage
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Low-connectivity area detected. Submissions serialize directly into browser IndexedDB and auto-flush when cellular connection resumes.
            </p>
          </div>
        </div>
      )}

      {pendingCount > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-medium/40 bg-medium-soft p-3.5 text-medium">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span className="text-xs font-semibold">
              {pendingCount} report(s) queued in browser {storageEngine}
            </span>
          </div>
          <button
            type="button"
            onClick={syncNow}
            disabled={isSyncing || !isOnline}
            className="inline-flex items-center gap-1.5 rounded-md bg-medium px-3 py-1 text-xs font-bold text-black hover:bg-medium/90 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Flushing to Cloud..." : "Sync Now"}
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
        {/* Step 0: Select Sick Animal Species */}
        <section className="panel p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-bold text-foreground">
                Select Sick Animal
              </h2>
              <p className="text-xs text-muted-foreground">
                Tap the animal type to show relevant clinical symptoms and suspected diseases
              </p>
            </div>
            <AudioSpeakButton
              text={`Select sick animal type. Currently selected: ${species}. Tap Cattle, Buffalo, Sheep, Goat, or Pig to switch.`}
              variant="badge"
              label="Audio Guide"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {[
              { id: "Cattle", icon: "🐄", name: "Cattle / Cow", vernacular: "மாடு / பசு", sub: "Kangayam / Dairy" },
              { id: "Buffalo", icon: "🐃", name: "Buffalo", vernacular: "எருமை", sub: "Murrah / Surti" },
              { id: "Sheep", icon: "🐑", name: "Sheep", vernacular: "செம்மறி ஆடு", sub: "Mecheri / Mandya" },
              { id: "Goat", icon: "🐐", name: "Goat", vernacular: "வெள்ளாடு", sub: "Salem Black / Boer" },
              { id: "Pig", icon: "🐖", name: "Swine / Pig", vernacular: "பன்றி", sub: "Large White Yorkshire" },
            ].map((opt) => {
              const active = species === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setSpecies(opt.id);
                    setSymptoms([]);
                  }}
                  className={`relative flex flex-col items-center text-center p-3 rounded-xl border transition-all cursor-pointer ${
                    active
                      ? "border-primary bg-primary/10 ring-2 ring-primary shadow-sm"
                      : "border-border bg-card hover:border-primary/40 hover:bg-muted/50"
                  }`}
                >
                  <span className="text-3xl mb-1.5">{opt.icon}</span>
                  <span className="text-xs font-bold text-foreground leading-tight">{opt.name}</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5 font-medium">{opt.vernacular}</span>
                  <span className="text-[9px] text-muted-foreground/80 mt-0.5">{opt.sub}</span>
                  {active && (
                    <div className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white shadow">
                      ✓
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Step 1: Tap the pictures that match */}
        <section className="panel p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div>
              <h2 className="font-display text-sm font-semibold">{t("report.step1")}</h2>
              <p className="text-xs text-muted-foreground">
                Tap matching clinical signs for <span className="font-bold text-primary">{species}</span>. Speak if easier.
              </p>
            </div>
            <AudioSpeakButton
              text={`${t("report.sec1.speech")} Currently viewing symptoms for ${species}.`}
              variant="badge"
              label="Hear Step 1"
            />
          </div>
          <div>
            <SymptomTiles species={species} selected={symptoms} onToggle={toggleSymptom} />
          </div>
        </section>

        {/* Step 2: Animal count, location, and recipient email */}
        <section className="panel p-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-sm font-semibold">{t("report.step2")}</h2>
              <p className="text-xs text-muted-foreground">Specify affected count, location, and reporter contact</p>
            </div>
            <AudioSpeakButton
              text="Step 2: How many animals? Specify affected count, mortality, village name, and ear tag."
              variant="badge"
              label="Hear Step 2"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Counter label={t("report.affected")} value={affected} onChange={setAffected} min={1} />
            <Counter label={t("report.deaths")} value={deaths} onChange={setDeaths} min={0} isDeath />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 pt-1">
            {/* Village with quick buttons */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="label-caps block text-xs font-semibold">{t("report.village")}</label>
                <button
                  type="button"
                  onClick={handleGpsAutofill}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline cursor-pointer"
                >
                  <MapPin className="h-3 w-3" />
                  Auto GPS
                </button>
              </div>
              <input
                required
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                placeholder="e.g. Gobichettipalayam Pasture, Kullampalayam"
                className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {POPULAR_VILLAGES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVillage(v)}
                    className={`rounded px-2 py-0.5 text-[10px] font-medium border transition cursor-pointer ${
                      village === v
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-surface text-muted-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Ear tag with quick fill */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="label-caps block text-xs font-semibold">{t("report.tag")}</label>
                <button
                  type="button"
                  onClick={() => setTag("IN-TN-2031-4471")}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline cursor-pointer"
                >
                  <Tag className="h-3 w-3" />
                  Collar 4471
                </button>
              </div>
              <input
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="IN-TN-2031-4471 (Optional)"
                className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-[10px] text-muted-foreground">
                Collar tag or INAPH 12-digit RFID tag if available
              </p>
            </div>
          </div>

          {/* Reporter Identity & Email Delivery Box */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold text-foreground">
                  Send Copy of Clinical Report to Your Email
                </span>
              </div>
              <span className="rounded bg-primary/20 text-primary px-2 py-0.5 text-[10px] font-bold">
                Auto-Dispatched
              </span>
            </div>

            <div className="grid sm:grid-cols-3 gap-2.5">
              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">
                  Reporter Name
                </label>
                <input
                  type="text"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  className="w-full rounded-md border border-input bg-card px-2.5 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">
                  Mobile / WhatsApp
                </label>
                <input
                  type="tel"
                  value={reporterPhone}
                  onChange={(e) => setReporterPhone(e.target.value)}
                  className="w-full rounded-md border border-input bg-card px-2.5 py-1.5 text-xs font-mono text-foreground focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">
                  Your Email (Inbox Delivery)
                </label>
                <input
                  type="email"
                  value={reporterEmail}
                  onChange={(e) => setReporterEmail(e.target.value)}
                  className="w-full rounded-md border border-input bg-card px-2.5 py-1.5 text-xs font-mono text-foreground focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-0.5">
              <input
                type="checkbox"
                checked={sendEmailCopy}
                onChange={(e) => setSendEmailCopy(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-[11px] text-muted-foreground">
                Email full veterinary case report to <span className="text-foreground font-semibold">{reporterEmail}</span> upon submission
              </span>
            </label>
          </div>
        </section>

        {/* Step 3: Selected symptoms pills, voice recording, and clinical notes */}
        <section className="panel p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-sm font-semibold">{t("report.step3")}</h2>
              <p className="text-xs text-muted-foreground">Speak in your language or add field notes</p>
            </div>
            <AudioSpeakButton
              text={t("report.sec3.speech")}
              variant="badge"
              label="Hear Step 3"
            />
          </div>

          {/* Selected Symptoms Review Pills */}
          {symptoms.length > 0 && (
            <div className="rounded-lg border border-border/80 bg-surface p-3 space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Selected Clinical Signs ({symptoms.length}):
              </p>
              <div className="flex flex-wrap gap-1.5">
                {symptoms.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1 rounded-md bg-primary/15 text-primary px-2 py-0.5 text-xs font-semibold"
                  >
                    <span>✓ {s}</span>
                    <button
                      type="button"
                      onClick={() => toggleSymptom(s)}
                      className="text-primary hover:text-critical font-bold ml-1"
                      title="Remove"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Voice input */}
          <div className="flex flex-wrap items-center gap-3">
            <VoiceButton onTranscript={(text) => setVoice((prev) => (prev ? prev + " " + text : text))} />
            {voice && (
              <div className="flex items-center gap-2 rounded-md bg-surface border border-border px-3 py-1.5">
                <p className="text-sm text-muted-foreground italic">“{voice}”</p>
                <AudioSpeakButton text={voice} variant="icon" />
              </div>
            )}
          </div>

          {/* Clinical Notes Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label-caps block">{t("report.notes")}</label>
              {notes && <AudioSpeakButton text={notes} variant="badge" label="Read aloud" />}
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Animal refused feed since morning, high drooling, sores on hooves, isolated from rest of herd..."
              rows={3}
              className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </section>

        {/* Submit button with email badge */}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full rounded-xl bg-primary px-4 py-3.5 text-sm font-bold text-primary-foreground shadow-md transition-all hover:bg-primary/90 disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
        >
          <ClipboardList className="h-4 w-4" />
          {mutation.isPending
            ? "Sending & Emailing Case Report..."
            : !isOnline
            ? "Save to Offline Queue"
            : `Send Report & Email to ${reporterEmail}`}
        </button>
      </form>

      {/* Submission Success & Email Dispatch Modal */}
      {submittedReport && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl border border-emerald-500/40 bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-foreground">
                    Field Report Dispatched & Logged!
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono">
                    Case #{submittedReport.id} · {new Date().toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSubmittedReport(null)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Case summary card */}
            <div className="rounded-xl border border-border bg-surface p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Target Animal:</span>
                <span className="font-bold text-foreground">{submittedReport.species}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Location:</span>
                <span className="font-semibold text-foreground">{submittedReport.village}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Affected / Deaths:</span>
                <span className="font-mono text-foreground font-bold">
                  {submittedReport.affected_count} affected, {submittedReport.mortality_count} deaths
                </span>
              </div>
              <div className="text-xs pt-1 border-t border-border/60">
                <span className="text-muted-foreground block mb-0.5">Reported Symptoms:</span>
                <span className="font-semibold text-primary">
                  {Array.isArray(submittedReport.symptoms) ? submittedReport.symptoms.join(" · ") : submittedReport.symptoms}
                </span>
              </div>
            </div>

            {/* Email Dispatch Status */}
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">Report Sent to Your Email</span>
                </div>
                <span className="rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[10px] font-bold">
                  ✓ Live Resend Dispatched
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                An automated biosecurity clinical report has been dispatched to <span className="font-bold text-foreground">{targetEmail}</span> via Resend SMTP. You can also view it in Gmail or share it instantly on WhatsApp:
              </p>

              <div className="flex flex-wrap gap-2 pt-1">
                <a
                  href={gmailComposeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-red-500 shadow transition"
                >
                  <Mail className="h-3.5 w-3.5" />
                  ✉️ Open Report in Gmail
                </a>
                <a
                  href={whatsappShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-500 shadow transition"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  📲 Share via WhatsApp
                </a>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <Link
                to="/command"
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
              >
                <span>View on Command Console</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
              <button
                type="button"
                onClick={() => setSubmittedReport(null)}
                className="rounded-lg bg-foreground text-background px-4 py-1.5 text-xs font-bold hover:opacity-90 transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Counter({
  label,
  value,
  onChange,
  min,
  isDeath,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  isDeath?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-3.5 transition ${isDeath && value > 0 ? "border-critical/40 bg-critical/5 text-critical" : "border-border bg-surface"}`}>
      <div className="flex items-center justify-between">
        <label className="label-caps block text-xs font-semibold">{label}</label>
        {isDeath && value > 0 && (
          <span className="rounded bg-critical/20 text-critical text-[10px] font-bold px-1.5 py-0.2">
            Mortality Alert
          </span>
        )}
      </div>
      <div className="mt-2.5 flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-muted transition cursor-pointer"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-10 text-center text-xl font-bold font-mono tabular text-foreground">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-muted transition cursor-pointer"
        >
          <Plus className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-1 ml-auto">
          {[1, 5].map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => onChange(value + amt)}
              className="rounded bg-muted/60 px-2 py-1 text-[10px] font-mono font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
            >
              +{amt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
