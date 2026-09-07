import { useI18n } from "@/lib/i18n";
import { AudioSpeakButton } from "@/components/AudioSpeakButton";

// Cattle assets
import mouth from "@/assets/symptom-mouth-blisters.jpg";
import saliva from "@/assets/symptom-salivation.jpg";
import lame from "@/assets/symptom-lameness.jpg";
import offfeed from "@/assets/symptom-off-feed.jpg";
import diarrhoea from "@/assets/symptom-diarrhoea.jpg";
import milk from "@/assets/symptom-low-milk.jpg";
import down from "@/assets/symptom-down-animal.jpg";
import nodules from "@/assets/symptom-skin-nodules.jpg";

// Dedicated Buffalo assets (Unique, non-repeating)
import buffaloThroat from "@/assets/symptom-buffalo-throat.jpg";
import buffaloSaliva from "@/assets/symptom-buffalo-saliva.jpg";
import buffaloEyes from "@/assets/symptom-buffalo-eyes.jpg";
import buffaloDown from "@/assets/symptom-buffalo-down.jpg";
import buffaloBody from "@/assets/symptom-buffalo-body.jpg";
import buffaloVet from "@/assets/symptom-buffalo-vet.jpg";

// Dedicated Sheep assets (Unique, non-repeating)
import sheepMouth from "@/assets/symptom-sheep-mouth.jpg";
import sheepHead from "@/assets/symptom-sheep-head.jpg";
import sheepWool from "@/assets/symptom-sheep-wool.jpg";
import sheepLimp from "@/assets/symptom-sheep-limp.jpg";
import sheepHoof from "@/assets/symptom-sheep-hoof.jpg";
import sheepFlock from "@/assets/symptom-sheep-flock.jpg";

// Dedicated Goat assets (Unique, non-repeating)
import goatMouth from "@/assets/symptom-goat-mouth.jpg";
import goatExam from "@/assets/symptom-goat-exam.jpg";
import goatHead from "@/assets/symptom-goat-head.jpg";
import goatDown from "@/assets/symptom-goat-down.jpg";
import goatFace from "@/assets/symptom-goat-face.jpg";

// Dedicated Pig assets (Unique, non-repeating)
import pigSkin from "@/assets/symptom-pig-skin.jpg";
import pigBody from "@/assets/symptom-pig-body.jpg";
import pigSnout from "@/assets/symptom-pig-snout.jpg";
import pigFace from "@/assets/symptom-pig-face.jpg";

interface SymptomDef {
  key: string;
  img: string;
  label: string;
  badge?: string;
  diseaseHint?: string;
}

const SPECIES_SYMPTOMS: Record<string, SymptomDef[]> = {
  Cattle: [
    { key: "sym.mouth", img: mouth, label: "Blisters in mouth", badge: "FMD", diseaseHint: "Foot-and-Mouth Disease" },
    { key: "sym.saliva", img: saliva, label: "Drooling saliva", badge: "FMD", diseaseHint: "Excess ropy salivation" },
    { key: "sym.lame", img: lame, label: "Limping / Foot lesions", badge: "FMD / Footrot", diseaseHint: "Interdigital sores" },
    { key: "sym.nodules", img: nodules, label: "Skin lumps / Nodules", badge: "LSD", diseaseHint: "Lumpy Skin Disease" },
    { key: "sym.offfeed", img: offfeed, label: "Not eating / High fever", badge: "General Fever", diseaseHint: "High temperature" },
    { key: "sym.milk", img: milk, label: "Reduced milk yield", badge: "Mastitis / FMD", diseaseHint: "Sudden milk drop" },
    { key: "sym.diarrhoea", img: diarrhoea, label: "Loose motion / Diarrhoea", badge: "Enteric", diseaseHint: "Digestive distress" },
    { key: "sym.down", img: down, label: "Cannot stand / Down animal", badge: "Critical", diseaseHint: "Severe weakness" },
  ],
  Buffalo: [
    { key: "sym.throat", img: buffaloThroat, label: "Swollen throat / Brisket", badge: "HS (Galghotu)", diseaseHint: "Haemorrhagic Septicaemia" },
    { key: "sym.saliva", img: buffaloSaliva, label: "Heavy drooling & grunting", badge: "HS / FMD", diseaseHint: "Tongue protruding" },
    { key: "sym.fever", img: buffaloEyes, label: "High fever & watery eyes", badge: "Acute HS", diseaseHint: "Temperature > 106°F" },
    { key: "sym.down", img: buffaloDown, label: "Cannot stand / Downer", badge: "Critical HS", diseaseHint: "Recumbency & asphyxia" },
    { key: "sym.body", img: buffaloBody, label: "Stiffness & muscle tremors", badge: "Acute Distress", diseaseHint: "Tremors & dullness" },
    { key: "sym.exam", img: buffaloVet, label: "Veterinary triage needed", badge: "Urgent Care", diseaseHint: "Immediate intervention" },
    { key: "sym.milk", img: milk, label: "Severe milk drop", badge: "Lactation Loss", diseaseHint: "Sudden drop in output" },
    { key: "sym.diarrhoea", img: diarrhoea, label: "Watery foul diarrhoea", badge: "Enteritis", diseaseHint: "Severe dehydration" },
  ],
  Sheep: [
    { key: "sym.bluetongue", img: sheepMouth, label: "Blue tongue & swollen lips", badge: "Bluetongue", diseaseHint: "Cyanotic tongue & edema" },
    { key: "sym.nasal", img: sheepHead, label: "Crusty nose & discharge", badge: "PPR / Bluetongue", diseaseHint: "Muco-purulent catarrh" },
    { key: "sym.wool", img: sheepWool, label: "Wool loss / Fleece damage", badge: "Sheep Pox", diseaseHint: "Patchy fleece shedding" },
    { key: "sym.lame", img: sheepLimp, label: "Severe foot rot / Limping", badge: "Foot Rot", diseaseHint: "Interdigital necrosis" },
    { key: "sym.hoof", img: sheepHoof, label: "Hoof lesions & swelling", badge: "Hoof Infection", diseaseHint: "Painful claw lesion" },
    { key: "sym.flock", img: sheepFlock, label: "Separated from flock", badge: "Dullness", diseaseHint: "Lagging behind pasture herd" },
    { key: "sym.diarrhoea", img: diarrhoea, label: "Black / bloody diarrhoea", badge: "Enterotoxaemia", diseaseHint: "Pulpy kidney disease" },
    { key: "sym.down", img: down, label: "Sudden death / Down sheep", badge: "Acute Anthrax / ET", diseaseHint: "Immediate quarantine alert" },
  ],
  Goat: [
    { key: "sym.mouth", img: goatMouth, label: "Severe mouth sores / Orf", badge: "PPR (Goat Plague)", diseaseHint: "Peste des Petits Ruminants" },
    { key: "sym.exam", img: goatExam, label: "Oral ulcer inspection", badge: "Necrotic Lesion", diseaseHint: "Ecthyma pustules" },
    { key: "sym.nasal", img: goatHead, label: "Heavy eye & nasal crusts", badge: "PPR Catarrh", diseaseHint: "Crusted nostrils" },
    { key: "sym.down", img: goatDown, label: "Cannot stand / Down goat", badge: "Critical PPR", diseaseHint: "Late-stage recumbency" },
    { key: "sym.face", img: goatFace, label: "Dullness & emaciation", badge: "Anorexia", diseaseHint: "Fever & wasting" },
    { key: "sym.lame", img: lame, label: "Swollen knee joints / Limping", badge: "CAE / Arthritis", diseaseHint: "Joint inflammation" },
    { key: "sym.diarrhoea", img: diarrhoea, label: "Watery profuse diarrhoea", badge: "PPR Enteric", diseaseHint: "Foul-smelling diarrhea" },
    { key: "sym.cough", img: offfeed, label: "Rapid coughing & breathing", badge: "CCPP Pneumonia", diseaseHint: "Caprine Pleuropneumonia" },
  ],
  Pig: [
    { key: "sym.blotches", img: pigSkin, label: "Purple ear blotches", badge: "African Swine Fever", diseaseHint: "Cutaneous haemorrhage" },
    { key: "sym.body", img: pigBody, label: "Flank & body red rash", badge: "Classical Swine", diseaseHint: "Skin erythema" },
    { key: "sym.mouth", img: pigSnout, label: "Snout blisters & sores", badge: "Swine Vesicular", diseaseHint: "Snout ulcerations" },
    { key: "sym.cough", img: pigFace, label: "Thumping breathing & cough", badge: "Swine Flu", diseaseHint: "Respiratory distress" },
    { key: "sym.lame", img: lame, label: "Hoof lesions & lameness", badge: "Foot Sore", diseaseHint: "Reluctance to walk" },
    { key: "sym.diarrhoea", img: diarrhoea, label: "Watery bloody diarrhoea", badge: "Swine Dysentery", diseaseHint: "Intestinal bleeding" },
    { key: "sym.offfeed", img: offfeed, label: "Off feed & vomiting", badge: "Acute Fever", diseaseHint: "High temperature" },
    { key: "sym.down", img: down, label: "Down pig / Incoordination", badge: "Paralysis / ASF", diseaseHint: "Sudden mortality alert" },
  ],
};

export function SymptomTiles({
  selected,
  onToggle,
  species = "Cattle",
}: {
  selected: string[];
  onToggle: (label: string) => void;
  species?: string;
}) {
  const { t } = useI18n();

  const normalizedSpecies = SPECIES_SYMPTOMS[species] ? species : "Cattle";
  const symptoms = SPECIES_SYMPTOMS[normalizedSpecies] || SPECIES_SYMPTOMS.Cattle;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground pb-1">
        <span className="font-semibold text-foreground flex items-center gap-1.5">
          <span>Clinical signs & photographic evidence for:</span>
          <span className="text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-md border border-primary/30">
            {normalizedSpecies}
          </span>
        </span>
        <span className="text-[11px] font-mono">{symptoms.length} Unique Clinical Signs</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {symptoms.map((s) => {
          const active = selected.includes(s.label);
          const translatedText = t(s.key) !== s.key ? t(s.key) : s.label;

          return (
            <div
              key={s.label}
              onClick={() => onToggle(s.label)}
              className={`group relative overflow-hidden rounded-xl border text-left transition-all cursor-pointer shadow-xs ${
                active
                  ? "border-primary ring-2 ring-primary scale-[0.99] bg-primary/5"
                  : "border-border hover:border-primary/50 hover:shadow-md"
              }`}
            >
              <div className="relative aspect-square w-full overflow-hidden bg-muted">
                <img
                  src={s.img}
                  alt={translatedText}
                  className="aspect-square w-full object-cover transition duration-300 group-hover:scale-105"
                />

                {/* Pathogen / Disease Badge */}
                {s.badge && (
                  <div className="absolute left-2 top-2">
                    <span className="rounded bg-black/75 backdrop-blur-xs px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-300 shadow border border-white/10">
                      {s.badge}
                    </span>
                  </div>
                )}

                {/* Selection Checkmark */}
                {active && (
                  <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground font-bold shadow-lg animate-in zoom-in-75">
                    ✓
                  </div>
                )}

                {/* Label Overlay */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent px-2.5 pb-2.5 pt-8 flex items-end justify-between">
                  <div className="min-w-0 pr-1">
                    <span className="text-xs font-bold text-white leading-tight drop-shadow block truncate">
                      {translatedText}
                    </span>
                    {s.diseaseHint && (
                      <span className="text-[10px] text-zinc-300 block truncate">
                        {s.diseaseHint}
                      </span>
                    )}
                  </div>
                  <AudioSpeakButton
                    text={`${translatedText}. Possible ${s.diseaseHint || s.badge || "condition"}.`}
                    variant="icon"
                    className="bg-black/60 text-white hover:bg-black/90 h-6 w-6 p-1 shrink-0 shadow"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
