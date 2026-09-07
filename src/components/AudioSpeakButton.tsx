import { useState, useEffect } from "react";
import { Volume2, VolumeX, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { isTtsSupported, speakText, stopSpeaking } from "@/lib/tts";

interface AudioSpeakButtonProps {
  /** The text to be spoken aloud */
  text: string;
  /** Optional language locale (defaults to current active i18n speechLocale) */
  langCode?: string;
  /** Button style variant */
  variant?: "badge" | "icon" | "pill" | "outline";
  /** Optional label displayed next to icon */
  label?: string;
  /** Additional CSS class names */
  className?: string;
  /** Speech rate, defaults to 0.95 */
  rate?: number;
}

export function AudioSpeakButton({
  text,
  langCode,
  variant = "pill",
  label,
  className = "",
  rate,
}: AudioSpeakButtonProps) {
  const { speechLocale, lang } = useI18n();
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    setSupported(isTtsSupported());
  }, []);

  // Cleanup on unmount or when text changes
  useEffect(() => {
    return () => {
      if (speaking) {
        stopSpeaking();
      }
    };
  }, [speaking]);

  if (!supported) return null;

  const targetLocale = langCode || speechLocale || "en-IN";

  const toggleSpeak = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
    } else {
      setSpeaking(true);
      speakText(text, {
        lang: targetLocale,
        rate: rate ?? 0.95,
        onEnd: () => setSpeaking(false),
        onError: () => setSpeaking(false),
      });
    }
  };

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={toggleSpeak}
        title={speaking ? "Stop voice" : `Listen aloud (${targetLocale})`}
        aria-label={speaking ? "Stop voice" : `Listen aloud (${targetLocale})`}
        className={`relative inline-flex items-center justify-center rounded-full p-1.5 transition-all focus:outline-none focus:ring-2 focus:ring-primary ${
          speaking
            ? "bg-primary text-primary-foreground shadow-sm animate-pulse"
            : "text-muted-foreground hover:bg-surface hover:text-foreground"
        } ${className}`}
      >
        {speaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>
    );
  }

  if (variant === "badge") {
    return (
      <button
        type="button"
        onClick={toggleSpeak}
        className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium transition-all ${
          speaking
            ? "bg-primary text-primary-foreground shadow-sm"
            : "bg-surface border border-border text-foreground hover:bg-accent hover:border-primary/40"
        } ${className}`}
      >
        {speaking ? (
          <>
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
            <VolumeX className="h-3 w-3" />
            <span>Stop</span>
          </>
        ) : (
          <>
            <Volume2 className="h-3 w-3 text-primary" />
            <span>{label || "Listen"}</span>
          </>
        )}
      </button>
    );
  }

  if (variant === "outline") {
    return (
      <button
        type="button"
        onClick={toggleSpeak}
        className={`inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold shadow-sm transition-all hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary ${
          speaking ? "border-primary bg-primary/10 text-primary" : "text-foreground"
        } ${className}`}
      >
        {speaking ? (
          <>
            <div className="flex items-center gap-0.5">
              <span className="h-3 w-1 bg-primary animate-pulse rounded-full" />
              <span className="h-4 w-1 bg-primary animate-pulse delay-75 rounded-full" />
              <span className="h-2 w-1 bg-primary animate-pulse delay-150 rounded-full" />
            </div>
            <span>Stop voice</span>
          </>
        ) : (
          <>
            <Volume2 className="h-3.5 w-3.5 text-primary" />
            <span>{label || (lang === "hi" ? "आवाज़ में सुनें" : lang === "mr" ? "आवाजात ऐका" : "Listen aloud")}</span>
          </>
        )}
      </button>
    );
  }

  // Default "pill"
  return (
    <button
      type="button"
      onClick={toggleSpeak}
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary ${
        speaking
          ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-1 ring-offset-background"
          : "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border"
      } ${className}`}
    >
      {speaking ? (
        <>
          <div className="flex items-center gap-0.5">
            <span className="h-2.5 w-0.5 bg-white animate-pulse rounded-full" />
            <span className="h-3.5 w-0.5 bg-white animate-pulse delay-75 rounded-full" />
            <span className="h-2 w-0.5 bg-white animate-pulse delay-150 rounded-full" />
          </div>
          <span>Playing voice...</span>
        </>
      ) : (
        <>
          <Volume2 className="h-3.5 w-3.5 text-primary" />
          <span>{label || (lang === "hi" ? "आवाज़ में सुनें" : lang === "mr" ? "आवाजात ऐका" : "Listen aloud")}</span>
        </>
      )}
    </button>
  );
}
