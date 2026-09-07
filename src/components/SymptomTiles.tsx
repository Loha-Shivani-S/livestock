import { useI18n } from "@/lib/i18n";
import { AudioSpeakButton } from "@/components/AudioSpeakButton";
import mouth from "@/assets/symptom-mouth-blisters.jpg";
import saliva from "@/assets/symptom-salivation.jpg";
import lame from "@/assets/symptom-lameness.jpg";
import offfeed from "@/assets/symptom-off-feed.jpg";
import diarrhoea from "@/assets/symptom-diarrhoea.jpg";
import milk from "@/assets/symptom-low-milk.jpg";
import down from "@/assets/symptom-down-animal.jpg";
import nodules from "@/assets/symptom-skin-nodules.jpg";

const SYMPTOMS = [
  { key: "sym.mouth", img: mouth, label: "Mouth blisters" },
  { key: "sym.saliva", img: saliva, label: "Excess salivation" },
  { key: "sym.lame", img: lame, label: "Limping" },
  { key: "sym.offfeed", img: offfeed, label: "Off feed" },
  { key: "sym.diarrhoea", img: diarrhoea, label: "Diarrhoea" },
  { key: "sym.milk", img: milk, label: "Reduced milk yield" },
  { key: "sym.down", img: down, label: "Cannot stand" },
  { key: "sym.nodules", img: nodules, label: "Skin nodules" },
];

export function SymptomTiles({ selected, onToggle }: { selected: string[]; onToggle: (label: string) => void }) {
  const { t } = useI18n();
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {SYMPTOMS.map((s) => {
        const active = selected.includes(s.label);
        return (
          <div
            key={s.key}
            onClick={() => onToggle(s.label)}
            className={`group relative overflow-hidden rounded-lg border text-left transition-all cursor-pointer ${
              active ? "border-primary ring-2 ring-primary" : "border-border hover:border-primary/50"
            }`}
          >
            <img src={s.img} alt={t(s.key)} className="aspect-square w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-2 pb-2 pt-8 flex items-end justify-between">
              <span className="text-xs font-semibold text-white leading-tight drop-shadow">{t(s.key)}</span>
              <AudioSpeakButton
                text={t(s.key)}
                variant="icon"
                className="bg-black/60 text-white hover:bg-black/90 h-6 w-6 p-1 shrink-0 ml-1"
              />
            </div>
            {active && (
              <div className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold shadow">
                ✓
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
