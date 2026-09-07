import { LANGUAGES, useI18n, type LanguageCode } from "@/lib/i18n";
import { Globe } from "lucide-react";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useI18n();

  const handleSelect = (code: LanguageCode) => {
    setLang(code);
  };

  return (
    <div className="flex items-center gap-1.5 notranslate">
      <Globe className="h-3.5 w-3.5 text-primary shrink-0" />
      {!compact && <span className="text-xs text-muted-foreground hidden sm:inline">Language:</span>}
      <select
        value={lang}
        onChange={(e) => handleSelect(e.target.value as LanguageCode)}
        className="h-8 rounded-md border border-input bg-card px-2.5 text-xs font-semibold text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.native} ({l.label})
          </option>
        ))}
      </select>
    </div>
  );
}
