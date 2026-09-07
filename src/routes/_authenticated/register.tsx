import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { searchAnimals, getAnimalDossier, createLabRequisition, registerAnimal } from "@/lib/data-client";
import { useI18n } from "@/lib/i18n";
import { Search, Syringe, Pill, FileText, Plus, X, Tag } from "lucide-react";
import { toast } from "sonner";
import { LabSlipModal } from "@/components/LabSlipModal";
import { AudioSpeakButton } from "@/components/AudioSpeakButton";

export const Route = createFileRoute("/_authenticated/register")({
  component: RegisterPage,
  head: () => ({
    meta: [
      { title: "Animal register — HerdSentinel" },
      { name: "description", content: "Bharat Pashudhan-aligned animal records, vaccination and treatment history." },
    ],
  }),
});

function RegisterPage() {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [activeSlip, setActiveSlip] = useState<any | null>(null);

  const { data: results } = useQuery({
    queryKey: ["animals", q],
    queryFn: () => searchAnimals({ q }),
  });

  const { data: dossier } = useQuery({
    queryKey: ["dossier", selectedTag],
    queryFn: () => getAnimalDossier({ tagId: selectedTag! }),
    enabled: !!selectedTag,
  });

  const raiseLab = async () => {
    if (!selectedTag || !dossier?.animal) return;
    try {
      const slip = await createLabRequisition({
        tag_id: selectedTag,
        sample_type: "Blood + vesicular epithelium",
        collected_by: "Dr. Suresh Patil (BVO)",
      });
      setActiveSlip({
        ...slip,
        owner_name: dossier.animal.owner_name,
        village: dossier.animal.village,
        species: dossier.animal.species,
      });
      toast.success(`Lab slip created: ${slip.reference}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to create lab slip");
    }
  };

  const queryClient = useQueryClient();
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [newSpecies, setNewSpecies] = useState("Cattle");
  const [newBreed, setNewBreed] = useState("Gir Cow");
  const [newSex, setNewSex] = useState("female");
  const [newOwner, setNewOwner] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newVillage, setNewVillage] = useState("Gobichettipalayam");
  const [newCollar, setNewCollar] = useState("GW-DINDORI-01");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTag.trim() || !newOwner.trim() || !newVillage.trim()) {
      toast.error("Please fill in Tag ID, Owner Name, and Village.");
      return;
    }
    setRegistering(true);
    try {
      const created = await registerAnimal({
        tag_id: newTag.trim().toUpperCase(),
        species: newSpecies,
        breed: newBreed,
        sex: newSex,
        owner_name: newOwner.trim(),
        owner_phone: newPhone.trim() || undefined,
        village: newVillage.trim(),
        collar_node_id: newCollar.trim() || undefined,
      });
      toast.success(`RFID Tag ${created.tag_id} saved to Supabase database!`);
      await queryClient.invalidateQueries({ queryKey: ["animals"] });
      setSelectedTag(created.tag_id);
      setIsRegisterOpen(false);
      // Reset form
      setNewTag("");
      setNewOwner("");
      setNewPhone("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to register animal to database");
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("reg.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("reg.lede")}</p>
        </div>
        <div className="flex items-center gap-2">
          <AudioSpeakButton
            text={`${t("reg.title")}. ${t("reg.lede")}`}
            variant="outline"
            label="Hear Overview"
          />
          <button
            type="button"
            onClick={() => setIsRegisterOpen(true)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Register New Tag
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("reg.search")}
          className="w-full rounded-md border border-input bg-card py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="panel max-h-[70vh] overflow-auto p-0 lg:col-span-1">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{results?.length ?? 0} records</p>
            <AudioSpeakButton
              text={`Ear-tag registry. Found ${results?.length ?? 0} registered animals in Bharat Pashudhan database.`}
              variant="badge"
              label="Records Audio"
            />
          </div>
          <div className="divide-y divide-border">
            {(results ?? []).map((a) => (
              <button
                key={a.tag_id}
                onClick={() => setSelectedTag(a.tag_id)}
                className={`w-full px-4 py-3 text-left transition-colors ${selectedTag === a.tag_id ? "bg-secondary" : "hover:bg-muted"}`}
              >
                <p className="font-semibold tabular">{a.tag_id}</p>
                <p className="text-xs text-muted-foreground">{a.owner_name} · {a.village}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="panel p-5 lg:col-span-2">
          {dossier?.animal ? (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold tabular">{dossier.animal.tag_id}</h2>
                    <AudioSpeakButton
                      text={`Animal ear tag ${dossier.animal.tag_id}. Species: ${dossier.animal.species}, Breed: ${dossier.animal.breed}, Owner: ${dossier.animal.owner_name}, Village: ${dossier.animal.village}.`}
                      variant="badge"
                      label="Read Profile"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">{dossier.animal.species} · {dossier.animal.breed} · {dossier.animal.sex}</p>
                </div>
                <button onClick={raiseLab} className="inline-flex items-center gap-2 rounded-md border border-input bg-card px-3 py-1.5 text-sm font-semibold hover:bg-accent">
                  <FileText className="h-4 w-4" /> Lab slip
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field icon={null} label={t("reg.owner")} value={dossier.animal.owner_name} />
                <Field icon={null} label={t("reg.village")} value={`${dossier.animal.village}, ${dossier.animal.block}`} />
                <Field icon={null} label={t("reg.breed")} value={dossier.animal.breed} />
                <Field icon={null} label={t("reg.dob")} value={dossier.animal.date_of_birth ?? "--"} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="flex items-center gap-2 font-display text-sm font-semibold">
                    <Syringe className="h-4 w-4" /> {t("reg.vaccinations")}
                  </h3>
                  <AudioSpeakButton
                    text={`Vaccination history for ${dossier.animal.tag_id}. ${dossier.vaccinations.length ? dossier.vaccinations.map((v) => `${v.vaccine} on ${v.administered_on}`).join(". ") : "No vaccination records."}`}
                    variant="badge"
                    label="Vaccines Audio"
                  />
                </div>
                <ul className="mt-2 space-y-2">
                  {dossier.vaccinations.length === 0 && <p className="text-sm text-muted-foreground">{t("reg.none")}</p>}
                  {dossier.vaccinations.map((v) => (
                    <li key={v.id} className="rounded-md border border-border bg-surface p-2 text-sm">
                      <span className="font-semibold">{v.vaccine}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{v.administered_on}</span>
                      {v.next_due_on && <span className="ml-2 text-xs text-medium">Next: {v.next_due_on}</span>}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="flex items-center gap-2 font-display text-sm font-semibold">
                    <Pill className="h-4 w-4" /> {t("reg.treatments")}
                  </h3>
                  <AudioSpeakButton
                    text={`Treatment history for ${dossier.animal.tag_id}. ${dossier.treatments.length ? dossier.treatments.map((tr) => `${tr.diagnosis} treated on ${tr.treated_on}`).join(". ") : "No treatment history recorded."}`}
                    variant="badge"
                    label="Treatments Audio"
                  />
                </div>
                <ul className="mt-2 space-y-2">
                  {dossier.treatments.length === 0 && <p className="text-sm text-muted-foreground">{t("reg.none")}</p>}
                  {dossier.treatments.map((tr) => (
                    <li key={tr.id} className="rounded-md border border-border bg-surface p-2 text-sm">
                      <span className="font-semibold">{tr.diagnosis}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{tr.treated_on}</span>
                      {tr.medicine && <p className="mt-1 text-xs text-muted-foreground">{tr.medicine}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              {selectedTag ? "Loading dossier…" : "Select an animal to view its record."}
            </div>
          )}
        </div>
      </div>

      <LabSlipModal
        isOpen={!!activeSlip}
        onClose={() => setActiveSlip(null)}
        requisition={activeSlip}
      />

      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="panel max-w-lg w-full p-6 shadow-xl border border-border">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold">Register New Animal (RFID Tag)</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsRegisterOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="label-caps block mb-1 text-xs">Bharat Pashudhan RFID Tag ID *</label>
                <input
                  required
                  placeholder="e.g. IN-MH-15-C9925"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm uppercase font-mono focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-caps block mb-1 text-xs">Species</label>
                  <select
                    value={newSpecies}
                    onChange={(e) => setNewSpecies(e.target.value)}
                    className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm focus:ring-2 focus:ring-ring"
                  >
                    <option value="Cattle">Cattle (Cow / Bull)</option>
                    <option value="Buffalo">Buffalo</option>
                    <option value="Goat">Goat</option>
                    <option value="Sheep">Sheep</option>
                  </select>
                </div>
                <div>
                  <label className="label-caps block mb-1 text-xs">Sex</label>
                  <select
                    value={newSex}
                    onChange={(e) => setNewSex(e.target.value)}
                    className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm focus:ring-2 focus:ring-ring"
                  >
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-caps block mb-1 text-xs">Breed</label>
                  <input
                    placeholder="e.g. Gir Cow, Murrah"
                    value={newBreed}
                    onChange={(e) => setNewBreed(e.target.value)}
                    className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm focus:ring-2 focus:ring-ring"
                  >
                  </input>
                </div>
                <div>
                  <label className="label-caps block mb-1 text-xs">Collar Node Gateway</label>
                  <input
                    placeholder="GW-DINDORI-01"
                    value={newCollar}
                    onChange={(e) => setNewCollar(e.target.value)}
                    className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-caps block mb-1 text-xs">Owner Name *</label>
                  <input
                    required
                    placeholder="e.g. Kisan Patil"
                    value={newOwner}
                    onChange={(e) => setNewOwner(e.target.value)}
                    className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="label-caps block mb-1 text-xs">Owner Phone</label>
                  <input
                    placeholder="+91 98220 00000"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div>
                <label className="label-caps block mb-1 text-xs">Village / Location *</label>
                <input
                  required
                  placeholder="e.g. Gobichettipalayam"
                  value={newVillage}
                  onChange={(e) => setNewVillage(e.target.value)}
                  className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(false)}
                  className="rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registering}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {registering ? "Saving to Supabase..." : "Save Animal Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { icon?: null; label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-surface p-3">
      <p className="label-caps">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}
