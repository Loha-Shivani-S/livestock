import { useState, useEffect } from "react";
import {
  Volume2,
  VolumeX,
  Send,
  PhoneCall,
  MessageSquare,
  ShieldAlert,
  CheckCircle2,
  Share2,
  Bell,
  Smartphone,
  Mail,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { speakText, stopSpeaking } from "@/lib/tts";
import { dispatchAdvisory } from "@/lib/data-client";

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
    smsText:
      "எச்சரிக்கை: உங்கள் கிராமத்தில் 3 கி.மீ சுற்றளவில் கோமாரி நோய் (FMD) பரவல் கண்டறியப்பட்டுள்ளது. அவசர தடுப்பூசி முகாமிற்கு உடனே வரவும். அவசர உதவி: 1962.",
    audioSpeech:
      "எச்சரிக்கை: உங்கள் கிராமத்தில் மூன்று கிலோமீட்டர் சுற்றளவில் கோமாரி நோய் பரவல் கண்டறியப்பட்டுள்ளது. கால்நடைகளை தனிமைப்படுத்தி, உடனடி தடுப்பூசி முகாமிற்கு கொண்டு வரவும். உதவிக்கு 1962 எண்ணை அழைக்கவும்.",
  },
  en: {
    langName: "English",
    smsText:
      "URGENT ALERT: Foot-and-Mouth Disease (FMD) outbreak detected within 3 km quarantine ring. Report to village veterinary post for ring vaccination immediately. Toll-free: 1962.",
    audioSpeech:
      "Urgent bio-security alert. Foot-and-Mouth Disease outbreak detected within a three kilometer quarantine ring of your location. Immediate movement restriction and ring vaccination is underway. Contact the Block Veterinary Officer or dial 1962.",
  },
  hi: {
    langName: "हिन्दी (Hindi)",
    smsText:
      "चेतावनी: आपके गाँव के 3 किमी के दायरे में एफएम疗 (खुरपका-मुँहपका) रोग का गंभीर खतरा पाया गया है। कृपया तुरंत नजदीकी पशु चिकित्सा शिविर में संपर्क करें। हेल्पलाइन: 1962.",
    audioSpeech:
      "चेतावनी: आपके गाँव के तीन किलोमीटर के दायरे में खुरपका-मुँहपका रोग का गंभीर खतरा पाया गया है। कृपया तुरंत पशु चिकित्सा अधिकारी से संपर्क करें और पशुओं का टीकाकरण कराएं। हेल्पलाइन नंबर 1962.",
  },
  te: {
    langName: "తెలుగు (Telugu)",
    smsText:
      "హెచ్చరిక: మీ గ్రామంలో 3 కి.மீ పరిధిలో గాలికుంటు వ్యాధి (FMD) ముప్పు గుర్తించబడింది. వెంటనే పశువులకు టీకాలు వేయించండి. టోల్ ఫ్రీ: 1962.",
    audioSpeech:
      "హెచ్చరిక: మీ గ్రామంలో మూడు కిలోమీటర్ల పరిధిలో గాలికుంటు వ్యాధి ముప్పు గుర్తించబడింది. వెంటనే టీకా కేంద్రానికి చేరుకుని పశువులను రక్షించుకోండి. టోల్ ఫ్రీ 1962.",
  },
  mr: {
    langName: "मराठी (Marathi)",
    smsText:
      "सावधान: आपल्या गावाच्या ३ किमी परिसरात लाळ खुरकत (FMD) रोगाचा संसर्ग आढळला आहे. जनावरांचे त्वरित लसीकरण करून घ्यावे. पशुवैद्यकीय हेल्पलाइन: 1962.",
    audioSpeech:
      "सावधान: आपल्या गावाच्या तीन किलोमीटर परिसरात लाळ खुरकत रोगाचा संसर्ग आढळला आहे. बाधित जनावरांना वेगळे ठेवा आणि तात्काळ पशुवैद्यकीय अधिकाऱ्यांशी संपर्क साधा. हेल्पलाइन १९६२.",
  },
};

export function VernacularAlertModal({
  isOpen,
  onClose,
  village = "Gobichettipalayam",
  tagId = "IN-TN-2031-4471",
  disease = "Foot-and-Mouth Disease (FMD)",
}: VernacularAlertModalProps) {
  const [langCode, setLangCode] = useState<keyof typeof REGIONAL_ADVISORIES>("ta");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [myPhone, setMyPhone] = useState("+91 82706 503379");
  const [myEmail, setMyEmail] = useState("lohashivani360@gmail.com");
  const [addToDirectory, setAddToDirectory] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedPhone = localStorage.getItem("herdsentinel_user_phone");
      const savedEmail = localStorage.getItem("herdsentinel_user_email");
      if (savedPhone) {
        setMyPhone(savedPhone);
      } else {
        localStorage.setItem("herdsentinel_user_phone", "+91 82706 503379");
      }
      if (savedEmail) {
        setMyEmail(savedEmail);
      } else {
        localStorage.setItem("herdsentinel_user_email", "lohashivani360@gmail.com");
      }
    }
  }, [isOpen]);

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

  const triggerDesktopNotification = (text: string) => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification(`🚨 Outbreak Alert (${village})`, {
          body: text,
          icon: "/favicon.ico",
        });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((perm) => {
          if (perm === "granted") {
            new Notification(`🚨 Outbreak Alert (${village})`, {
              body: text,
              icon: "/favicon.ico",
            });
          }
        });
      }
    }
  };

  const handleDispatch = async () => {
    setIsDispatching(true);

    try {
      if (typeof window !== "undefined") {
        if (myPhone.trim()) localStorage.setItem("herdsentinel_user_phone", myPhone.trim());
        if (myEmail.trim()) localStorage.setItem("herdsentinel_user_email", myEmail.trim());
      }

      // Trigger instant desktop system push notification
      triggerDesktopNotification(current.smsText);

      // Call server function to log & dispatch via SMS gateway/email
      const res = await dispatchAdvisory({
        village,
        tagId,
        disease,
        language: langCode,
        message: current.smsText,
        recipientPhone: myPhone.trim() || undefined,
        recipientEmail: myEmail.trim() || undefined,
        addToDirectory,
        userName: "Livestock Watch Owner",
      });

      if (res?.ok) {
        toast.success(
          myPhone.trim()
            ? `Advisory broadcast dispatched! Sent to your phone (${myPhone.trim()}) & emergency network.`
            : `Advisory broadcast dispatched to registered farmers & officers in ${village}!`
        );
      } else {
        toast.info("Broadcast recorded in outbreak log.");
      }
    } catch (err) {
      toast.error("Dispatch completed with local simulation.");
    } finally {
      setIsDispatching(false);
    }
  };

  const cleanDigits = myPhone.replace(/\D/g, "");
  const whatsappUrl = cleanDigits
    ? `https://wa.me/${cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits}?text=${encodeURIComponent(current.smsText)}`
    : `https://wa.me/?text=${encodeURIComponent(current.smsText)}`;

  const smsUrl = cleanDigits
    ? `sms:${cleanDigits}?body=${encodeURIComponent(current.smsText)}`
    : `sms:?body=${encodeURIComponent(current.smsText)}`;

  const targetEmail = myEmail.trim() || "lohashivani360@gmail.com";
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(targetEmail)}&su=${encodeURIComponent(`[HERDSENTINEL OUTBREAK ADVISORY] ${disease} in ${village}`)}&body=${encodeURIComponent(current.smsText + "\n\nHelpline: 1962 (Toll Free)\nSector: " + village + " (" + tagId + ")")}`;

  const LANGUAGE_OPTIONS: { code: keyof typeof REGIONAL_ADVISORIES; label: string }[] = [
    { code: "ta", label: "தமிழ் (TA)" },
    { code: "en", label: "English (EN)" },
    { code: "hi", label: "हिन्दी (HI)" },
    { code: "te", label: "తెలుగు (TE)" },
    { code: "mr", label: "मराठी (MR)" },
  ];

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-critical/15 text-critical">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-foreground">
                Regional Vernacular Voice & SMS Broadcast
              </h2>
              <p className="text-xs text-muted-foreground">
                Targeted 3 km Outbreak Perimeter · {village} ({tagId})
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopSpeaking();
              onClose();
            }}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Language Tabs */}
        <div>
          <label className="label-caps mb-1.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Select Regional Vernacular Language
          </label>
          <div className="grid grid-cols-5 gap-1.5 rounded-lg bg-surface p-1 border border-border">
            {LANGUAGE_OPTIONS.map(({ code, label }) => (
              <button
                key={code}
                type="button"
                onClick={() => {
                  stopSpeaking();
                  setIsPlaying(false);
                  setLangCode(code);
                }}
                className={`rounded px-1.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  langCode === code
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground font-medium">
            Active dialect: <span className="text-foreground font-semibold">{current.langName}</span>
          </p>
        </div>

        {/* Audio Speech Player Card */}
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5 space-y-2.5">
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
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition shadow-sm cursor-pointer ${
                isPlaying
                  ? "bg-critical text-critical-foreground animate-pulse"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {isPlaying ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              {isPlaying ? "Stop Audio" : `Listen to Voice`}
            </button>
          </div>
          <p className="text-xs leading-relaxed text-foreground bg-card/60 p-2.5 rounded-lg border border-border/80 italic">
            “{current.audioSpeech}”
          </p>
        </div>

        {/* Targeted SMS Broadcast Card */}
        <div className="rounded-xl border border-border bg-surface p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-foreground" />
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                Outbreak Advisory Message
              </span>
            </div>
            <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              Helpline 1962
            </span>
          </div>
          <div className="rounded-lg bg-muted/60 p-2.5 text-xs font-mono text-foreground leading-relaxed">
            <p className="text-foreground">{current.smsText}</p>
          </div>
        </div>

        {/* Destination & "Send to Me" Box */}
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold text-foreground">Send Advisory Directly To You</span>
            </div>
            <span className="text-[10px] rounded bg-primary/15 text-primary font-bold px-2 py-0.5">
              Live Delivery
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">
            Enter your mobile number or email below so you receive this exact warning alert directly on your device.
          </p>

          <div className="grid sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                Your Mobile / WhatsApp Number
              </label>
              <input
                type="tel"
                placeholder="+91 98765 43210"
                value={myPhone}
                onChange={(e) => setMyPhone(e.target.value)}
                className="w-full rounded-lg border border-input bg-card px-2.5 py-1.5 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                Your Email (Optional)
              </label>
              <input
                type="email"
                placeholder="farmer@example.com"
                value={myEmail}
                onChange={(e) => setMyEmail(e.target.value)}
                className="w-full rounded-lg border border-input bg-card px-2.5 py-1.5 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={addToDirectory}
              onChange={(e) => setAddToDirectory(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary"
            />
            <span className="text-[11px] text-muted-foreground">
              Save my number in the emergency alert directory for future outbreaks
            </span>
          </label>

          {/* Quick External Send Links */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 shadow-2xs transition"
            >
              <Share2 className="h-3.5 w-3.5" />
              📲 Open in WhatsApp
            </a>
            <a
              href={gmailUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-500 shadow-2xs transition"
            >
              <Mail className="h-3.5 w-3.5" />
              ✉️ Open in Gmail
            </a>
            <a
              href={smsUrl}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted shadow-2xs transition"
            >
              <MessageSquare className="h-3.5 w-3.5 text-primary" />
              💬 Open in Phone SMS
            </a>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <p className="text-[10px] text-muted-foreground max-w-[200px] leading-tight">
            Broadcasts to registered livestock keepers & Block Veterinary Officers in Gobichettipalayam.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                stopSpeaking();
                onClose();
              }}
              className="rounded-lg border border-input px-3 py-1.5 text-xs font-semibold hover:bg-accent transition cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleDispatch}
              disabled={isDispatching}
              className="inline-flex items-center gap-1.5 rounded-lg bg-critical px-4 py-1.5 text-xs font-bold text-white hover:bg-critical/90 shadow-sm transition disabled:opacity-60 cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              {isDispatching ? "Broadcasting..." : "Broadcast Alert"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
