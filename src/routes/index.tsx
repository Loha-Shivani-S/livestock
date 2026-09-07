import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Activity, MapPin, Mic, Shield } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { AudioSpeakButton } from "@/components/AudioSpeakButton";
import hero from "@/assets/hero-farmer-collar.jpg";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "HerdSentinel — Multi-Species Disease Surveillance" },
      { name: "description", content: "Catch multi-species livestock disease outbreaks early with sensor collars, village gateways and voice-first field reporting." },
      { property: "og:title", content: "HerdSentinel — Multi-Species Disease Surveillance" },
      { property: "og:description", content: "Catch multi-species livestock disease outbreaks early with sensor collars, village gateways and voice-first field reporting." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function Home() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b border-border px-4 py-3 md:px-8">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Shield className="h-5 w-5" />
          </div>
          <span className="font-display text-lg font-bold">{t("app.name")}</span>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link to="/auth" className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            {t("nav.signin")}
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0">
          <img src={hero} alt="Farmer with collared buffalo" className="h-full w-full object-cover opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 py-16 md:py-24 md:px-8">
          <div className="flex items-center gap-3">
            <span className="label-caps text-primary">{t("home.eyebrow")}</span>
            <AudioSpeakButton
              text={`${t("home.title")}. ${t("home.lede")}`}
              variant="badge"
              label="Listen"
            />
          </div>
          <h1 className="mt-4 max-w-2xl text-4xl font-bold leading-tight md:text-5xl">{t("home.title")}</h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">{t("home.lede")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth" className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
              {t("home.cta.primary")} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/report" className="inline-flex items-center gap-2 rounded-md border border-input bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent">
              {t("home.cta.secondary")}
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 md:px-8">
        <div className="flex items-center justify-between gap-2 mb-6">
          <h2 className="text-xl font-bold">{t("home.how")}</h2>
          <AudioSpeakButton
            text="How the chain works: 1. Collar vitals streamed every 5 minutes. 2. Geospatial risk map with 3 kilometer containment rings. 3. Multilingual voice reporting for farmers. 4. Bharat Pashudhan animal records."
            variant="badge"
            label="Explain Chain"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card icon={Activity} title="Collar vitals" body="Temperature, heart rate and motion streamed every 5 minutes through LoRa gateways." />
          <Card icon={MapPin} title="Risk map" body="Geospatial hotspots, 3 km containment rings and outbreak triage on one screen." />
          <Card icon={Mic} title="Voice reports" body="Farmers report symptoms in their own language by speaking or tapping pictures." />
          <Card icon={Shield} title="Bharat Pashudhan records" body="Ear-tag-linked vaccination and treatment history for every animal." />
        </div>
      </section>
    </div>
  );
}

function Card({ icon: Icon, title, body }: { icon: React.ElementType; title: string; body: string }) {
  return (
    <div className="panel p-5 relative">
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <AudioSpeakButton text={`${title}. ${body}`} variant="icon" />
      </div>
      <h3 className="mt-4 font-display text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
