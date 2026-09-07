import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEvent) => void;
  onend: () => void;
  onerror: () => void;
  start: () => void;
  stop: () => void;
}

export function VoiceButton({ onTranscript }: { onTranscript: (text: string) => void }) {
  const { t, speechLocale } = useI18n();
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }
    const r: SpeechRecognitionLike = new SR();
    r.continuous = false;
    r.interimResults = true;
    r.lang = speechLocale;
    r.onresult = (event: SpeechRecognitionEvent) => {
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result && result.isFinal && result[0]) final += result[0].transcript;
      }
      if (final) onTranscript(final);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recognitionRef.current = r;
  }, [speechLocale, onTranscript]);

  const toggle = () => {
    if (!recognitionRef.current) return;
    if (listening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.lang = speechLocale;
      recognitionRef.current.start();
      setListening(true);
    }
  };

  if (!supported) {
    return <p className="text-xs text-muted-foreground">{t("report.speechUnsupported")}</p>;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
        listening
          ? "bg-critical text-critical-foreground animate-pulse"
          : "bg-primary text-primary-foreground hover:bg-primary/90"
      }`}
    >
      {listening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      {listening ? t("report.listening") : t("report.speak")}
    </button>
  );
}
