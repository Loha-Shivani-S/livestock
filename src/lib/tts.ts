/**
 * Multilingual Text-to-Speech (TTS) Engine for HerdSentinel.
 *
 * Seamlessly supports Indian regional languages:
 * - hi: Hindi (हिन्दी)
 * - mr: Marathi (मराठी)
 * - te: Telugu (తెలుగు)
 * - ta: Tamil (தமிழ்)
 * - kn: Kannada (ಕನ್ನಡ)
 * - gu: Gujarati (ગુજરાતી)
 * - bn: Bengali (বাংলা)
 * - pa: Punjabi (ਪੰਜਾਬੀ)
 * - ur: Urdu (اردو)
 * - en: English
 *
 * Architecture:
 * 1. Primary: High-fidelity regional audio stream from /api/tts.
 *    Provides authentic native human accent for Devanagari, Telugu, Tamil, etc.
 * 2. Fallback: Browser Web Speech API (window.speechSynthesis).
 */

export interface SpeakOptions {
  lang?: string; // e.g. "hi", "mr", "te", "ta", "en-IN", etc.
  rate?: number;
  pitch?: number;
  volume?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: any) => void;
}

let activeAudio: HTMLAudioElement | null = null;
let activeChunkTimeout: ReturnType<typeof setTimeout> | null = null;
let isCurrentlySpeaking = false;

export function isTtsSupported(): boolean {
  return typeof window !== "undefined";
}

export function isSpeaking(): boolean {
  return isCurrentlySpeaking;
}

/**
 * Stop any active audio or speech synthesis immediately.
 */
export function stopSpeaking(): void {
  isCurrentlySpeaking = false;

  if (activeChunkTimeout) {
    clearTimeout(activeChunkTimeout);
    activeChunkTimeout = null;
  }

  if (activeAudio) {
    try {
      activeAudio.pause();
      activeAudio.currentTime = 0;
      activeAudio.src = "";
    } catch {
      // ignore
    }
    activeAudio = null;
  }

  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
}

/**
 * Normalizes language tags (e.g. 'hi-IN' -> 'hi', 'mr-IN' -> 'mr', 'en-IN' -> 'en').
 */
function normalizeLangCode(raw?: string): string {
  if (!raw) return "en";
  const clean = raw.toLowerCase().trim().replace("_", "-");
  const code = clean.split("-")[0] || "en";
  return code;
}

/**
 * Split text into small natural sentences/phrases (<= 150 chars) for TTS streaming.
 */
function splitIntoChunks(text: string, maxLen = 150): string[] {
  const trimmed = text.trim();
  if (trimmed.length <= maxLen) return [trimmed];

  // Split by sentence delimiters: period, exclamation, question, devanagari danda (।), semicolon, newline
  const parts = trimmed.split(/([.!?;।\n]+)/);
  const chunks: string[] = [];
  let buffer = "";

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;

    if (buffer.length + part.length <= maxLen) {
      buffer += part;
    } else {
      if (buffer.trim()) chunks.push(buffer.trim());
      // If a single part is itself longer than maxLen, split by commas or words
      if (part.length > maxLen) {
        const words = part.split(/\s+/);
        let wordBuffer = "";
        for (const w of words) {
          if (wordBuffer.length + w.length + 1 <= maxLen) {
            wordBuffer += (wordBuffer ? " " : "") + w;
          } else {
            if (wordBuffer.trim()) chunks.push(wordBuffer.trim());
            wordBuffer = w;
          }
        }
        buffer = wordBuffer;
      } else {
        buffer = part;
      }
    }
  }

  if (buffer.trim()) {
    chunks.push(buffer.trim());
  }

  return chunks.length ? chunks : [trimmed];
}

/**
 * Fallback to browser window.speechSynthesis if network audio is unavailable.
 */
function speakWithWebSpeech(
  text: string,
  langCode: string,
  options: SpeakOptions
): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    options.onError?.(new Error("Web Speech not supported"));
    return;
  }

  try {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;
    utterance.rate = options.rate ?? 0.95;

    const voices = window.speechSynthesis.getVoices();
    const match = voices.find((v) =>
      v.lang.toLowerCase().replace("_", "-").startsWith(langCode)
    );
    if (match) {
      utterance.voice = match;
    } else if (langCode === "en") {
      const enVoice = voices.find((v) => v.lang.toLowerCase().includes("en"));
      if (enVoice) utterance.voice = enVoice;
    }
    // If no matching voice for non-English, do NOT assign English voice to Devanagari!

    utterance.onstart = () => {
      isCurrentlySpeaking = true;
      options.onStart?.();
    };
    utterance.onend = () => {
      isCurrentlySpeaking = false;
      options.onEnd?.();
    };
    utterance.onerror = (e) => {
      isCurrentlySpeaking = false;
      if (e.error !== "canceled" && e.error !== "interrupted") {
        options.onError?.(e);
      } else {
        options.onEnd?.();
      }
    };

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    isCurrentlySpeaking = false;
    options.onError?.(err);
  }
}

/**
 * Main multilingual speech function.
 * Handles single phrases, whole paragraphs, and multilingual switching smoothly.
 */
export function speakText(text: string, options: SpeakOptions = {}): () => void {
  stopSpeaking();

  if (!text || !text.trim()) {
    return () => {};
  }

  const langCode = normalizeLangCode(options.lang);
  const chunks = splitIntoChunks(text, 140);
  let currentIndex = 0;
  isCurrentlySpeaking = true;

  const playNextChunk = () => {
    if (!isCurrentlySpeaking) return;

    if (currentIndex >= chunks.length) {
      isCurrentlySpeaking = false;
      activeAudio = null;
      options.onEnd?.();
      return;
    }

    const chunk = chunks[currentIndex];
    if (!chunk) {
      isCurrentlySpeaking = false;
      activeAudio = null;
      options.onEnd?.();
      return;
    }
    currentIndex++;

    const audioUrl = `/api/tts?text=${encodeURIComponent(chunk)}&lang=${encodeURIComponent(langCode)}`;
    const audio = new Audio(audioUrl);
    activeAudio = audio;

    audio.oncanplaythrough = () => {
      if (!isCurrentlySpeaking) return;
      if (currentIndex === 1) {
        options.onStart?.();
      }
      audio.play().catch((err) => {
        console.warn("Audio play blocked or failed, falling back to Web Speech:", err);
        speakWithWebSpeech(text, langCode, options);
      });
    };

    audio.onended = () => {
      if (!isCurrentlySpeaking) return;
      // Small 150ms natural pause between sentences
      activeChunkTimeout = setTimeout(playNextChunk, 150);
    };

    audio.onerror = () => {
      console.warn("Proxy audio failed, attempting Web Speech API fallback...");
      speakWithWebSpeech(text, langCode, options);
    };

    // Trigger load
    audio.load();
  };

  playNextChunk();

  return () => {
    stopSpeaking();
  };
}
