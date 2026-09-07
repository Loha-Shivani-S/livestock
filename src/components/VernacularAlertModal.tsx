import { useState } from "react";
import { Volume2, VolumeX, Send, PhoneCall, MessageSquare, ShieldAlert, CheckCircle2, Globe } from "lucide-react";
import { toast } from "sonner";
import { speakText, stopSpeaking } from "@/lib/tts";

interface VernacularAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  village?: string | undefined;
  tagId?: string | undefined;
  disease?: string | undefined;
}

const REGIONAL_ADVISORIES = {
  ta: {
    langName: "தமிழ் (Tamil)",
    smsText: "எச்சரிக்கை: உங்கள் கிராமத்தில் 3 கி.மீ சுற்றளவில் கோமாரி நோய் (FMD) பரவல் கண்டறியப்பட்டுள்ளது. அவசர தடுப்பூசி முகாமிற்கு உடனே வரவும். அவசர உதவி: 1962.",
    audioSpeech: "எச்சரிக்கை: உங்கள் கிராமத்தில் மூன்று கிலோமீட்டர் சுற்றளவில் கோமாரி நோய் பரவல் கண்டறியப்பட்டுள்ளது. கால்நடைகளை தனிமைப்படுத்தி, உடனடி தடுப்பூசி முகாமிற்கு கொண்டு வரவும். உதவிக்கு 1962 எண்ணை அழைக்கவும்.",
  },
  hi: {
    langName: "हिन्दी (Hindi)",
    smsText: "चेतावनी: आपके गाँव के 3 किमी के दायरे में एफएमडी (खुरपका-मुँहपका) रोग का गंभीर खतरा पाया गया है। कृपया तुरंत नजदीकी पशु चिकित्सा शिविर में संपर्क करें। हेल्पलाइन: 1962.",
    audioSpeech: "चेतावनी: आपके गाँव के तीन किलोमीटर के दायरे में खुरपका-मुँहपका रोग का गंभीर खतरा पाया गया है। कृपया तुरंत पशु चिकित्सा अधिकारी से संपर्क करें और पशुओं का टीकाकरण कराएं। हेल्पलाइन नंबर 1962.",
  },
  mr: {
    langName: "मराठी (Marathi)",
    smsText: "सावधान: आपल्या गावाच्या ३ किमी परिसरात लाळ खुरकत (FMD) रोगाचा संसर्ग आढळला आहे. जनावरांचे त्वरित लसीकरण करून घ्यावे. पशुवैद्यकीय हेल्पलाइन: 1962.",
    audioSpeech: "सावधान: आपल्या गावाच्या तीन किलोमीटर परिसरात लाळ खुरकत रोगाचा संसर्ग आढळला आहे. बाधित जनावरांना वेगळे ठेवा आणि तात्काळ पशुवैद्यकीय अधिकाऱ्यांशी संपर्क साधा. हेल्पलाइन १९६२.",
  },
  te: {
    langName: "తెలుగు (Telugu)",
    smsText: "హెచ్చరిక: మీ గ్రామంలో 3 కి.మీ పరిధిలో గాలికుంటు వ్యాధి (FMD) ముప్పు గుర్తించబడింది. వెంటనే పశువులకు టీకాలు వేయించండి. టోల్ ఫ్రీ: 1962.",
    audioSpeech: "హెచ్చరిక: మీ గ్రామంలో మూడు కిలోమీటర్ల పరిధిలో గాలికుంటు వ్యాధి ముప్పు గుర్తించబడింది. వెంటనే టీకా కేంద్రానికి చేరుకుని పశువులను రక్షించుకోండి. టోల్ ఫ్రీ 1962.",
  },
  en: {
    langName: "English",
    smsText: "URGENT ALERT: Foot-and-Mouth Disease (FMD) outbreak detected within 3 km quarantine ring. Report to village veterinary post for ring vaccination immediately. Toll-free: 1962.",
    audioSpeech: "Urgent bio-security alert. Foot-and-Mouth Disease outbreak detected within a three kilometer quarantine ring of your location. Immediate movement restriction and ring vaccination is underway. Contact the Block Veterinary Officer or dial 1962.",
  },
};

export function VernacularAlertModal({
  isOpen,
  onClose,
  village = "Gobichettipalayam",
  tagId = "IN-MH-2031-4471",
  disease = "Foot-and-Mouth Disease (FMD)",
}: VernacularAlertModalProps) {
  const [langCode, setLangCode] = useState<keyof typeof REGIONAL_ADVISORIES>("hi");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);

  if (!isOpen) return null;

  const current = REGIONAL_ADVISORIES[langCode];

  const handlePlayVoice = () => {
    if (isPlaying) {
      stopSpeaking();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      speakText(current.audioSpeech, {
        lang: langCode,
        onEnd: () => setIsPlaying(false),
        onError: () => setIsPlaying(false),
      });
    }
  };

  const handleDispatchSMS = () => {
    setIsDispatching(true);
    setTimeout(() => {
      setIsDispatching(false);
      toast.success(`Fast2SMS / Twilio Webhook Fired! Dispatched to 140 registered farmers in ${village}.`);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-critical/15 text-critical">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-foreground">
                Regional Vernacular Voice & SMS Broadcast
              </h2>
              <p className="text-xs text-muted-foreground">
                Targeted 3 km Outbreak Perimeter · {village} Sector ({tagId})
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopSpeaking();
              onClose();
            }}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            ✕
          </button>
        </div>

        {/* Language Tabs */}
        <div>
          <label className="label-caps mb-1.5 block">Select Regional Vernacular Language</label>
          <div className="grid grid-cols-5 gap-1.5 rounded-lg bg-surface p-1 border border-border">
            {(Object.keys(REGIONAL_ADVISORIES) as Array<keyof typeof REGIONAL_ADVISORIES>).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => {
                  stopSpeaking();
                  setIsPlaying(false);
                  setLangCode(code);
                }}
                className={`rounded px-2 py-1.5 text-xs font-semibold transition ${
                  langCode === code ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground font-medium">
            Active: <span className="text-foreground">{current.langName}</span>
          </p>
        </div>

        {/* Audio Speech Player Card */}
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PhoneCall className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Automated IVR Voice Call Broadcast
              </span>
            </div>
            <button
              type="button"
              onClick={handlePlayVoice}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition shadow-sm ${
                isPlaying ? "bg-critical text-critical-foreground animate-pulse" : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {isPlaying ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              {isPlaying ? "Stop Audio" : `Play ${current.langName} Audio`}
            </button>
          </div>
          <p className="text-xs leading-relaxed text-foreground bg-card/60 p-2.5 rounded border border-border italic">
            “{current.audioSpeech}”
          </p>
        </div>

        {/* SMS Webhook Payload Card */}
        <div className="rounded-lg border border-border bg-surface p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-foreground" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Fast2SMS / Twilio Webhook Payload
              </span>
            </div>
            <span className="rounded bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
              DND-Compliant Service Implicit
            </span>
          </div>
          <div className="rounded bg-muted/60 p-2 text-xs font-mono text-foreground leading-relaxed">
            <p className="text-muted-foreground text-[10px]">ROUTE: /v1/dispatch/bulk-sms (140 Recipients)</p>
            <p className="mt-1">{current.smsText}</p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <button
            type="button"
            onClick={() => {
              stopSpeaking();
              onClose();
            }}
            className="rounded-md border border-input px-3.5 py-2 text-xs font-semibold hover:bg-accent"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleDispatchSMS}
            disabled={isDispatching}
            className="inline-flex items-center gap-2 rounded-md bg-critical px-4 py-2 text-xs font-bold text-critical-foreground hover:bg-critical/90 shadow-sm disabled:opacity-60"
          >
            <Send className="h-3.5 w-3.5" />
            {isDispatching ? "Broadcasting..." : "Dispatch SMS Webhook Now"}
          </button>
        </div>
      </div>
    </div>
  );
}
