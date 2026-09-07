import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getLabRequisitions, getLabRequisitionByToken, updateLabResult } from "@/lib/data-client";
import { useI18n } from "@/lib/i18n";
import { QrCode, Search, CheckCircle2, AlertOctagon, FileCheck, ShieldAlert, Sparkles, Building2, Calendar, User, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { LabSlipModal } from "@/components/LabSlipModal";
import { AudioSpeakButton } from "@/components/AudioSpeakButton";

export const Route = createFileRoute("/_authenticated/lab")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      token: (search.token as string) || "",
    };
  },
  component: LabPage,
  head: () => ({
    meta: [
      { title: "Lab Portal & Sample Verification — HerdSentinel" },
      { name: "description", content: "Scan QR requisition slips, record diagnostic findings and update outbreak status." },
    ],
  }),
});

function LabPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const searchParams = Route.useSearch();
  const [searchQuery, setSearchQuery] = useState(searchParams.token || "");
  const [selectedSlip, setSelectedSlip] = useState<any | null>(null);

  // Form states for test finding entry
  const [diagnosticTest, setDiagnosticTest] = useState("RT-qPCR");
  const [pathogen, setPathogen] = useState("Foot-and-Mouth Disease Virus (FMDV - Serotype O)");
  const [resultStatus, setResultStatus] = useState<"positive" | "negative" | "inconclusive">("positive");
  const [findings, setFindings] = useState("Positive amplification at Ct 21.4. VP1 capsid gene sequence indicates Serotype O lineage.");
  const [officerName, setOfficerName] = useState("Dr. Arvind Deshmukh (Senior Microbiologist, RDDL Pune)");

  const { data: allRequisitions, isLoading: loadingList } = useQuery({
    queryKey: ["lab-requisitions"],
    queryFn: () => getLabRequisitions(),
  });

  const { data: searchResult, isLoading: searching, refetch } = useQuery({
    queryKey: ["lab-requisition-lookup", searchQuery],
    queryFn: () => getLabRequisitionByToken({ query: searchQuery }),
    enabled: !!searchQuery.trim(),
  });

  useEffect(() => {
    if (searchParams.token) {
      setSearchQuery(searchParams.token);
    }
  }, [searchParams.token]);

  const activeRequisition = searchResult?.requisition || (allRequisitions && allRequisitions.length > 0 ? allRequisitions[0] : null);

  const mutation = useMutation({
    mutationFn: updateLabResult,
    onSuccess: (data) => {
      if (data.requisition.result_status === "positive") {
        toast.error("OUTBREAK CONFIRMED: 5 km quarantine ring active & BVO alert dispatched", {
          duration: 6000,
        });
      } else {
        toast.success("Diagnostic finding saved: Sample cleared (Negative)", { duration: 5000 });
      }
      qc.invalidateQueries({ queryKey: ["lab-requisitions"] });
      qc.invalidateQueries({ queryKey: ["lab-requisition-lookup"] });
      qc.invalidateQueries({ queryKey: ["command"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRequisition) return;

    mutation.mutate({
      requisition_id: activeRequisition.id,
      diagnostic_test: diagnosticTest,
      pathogen,
      result_status: resultStatus,
      findings,
      reported_by: officerName,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Diagnostic Lab Response & QR Verification</h1>
          <p className="text-sm text-muted-foreground">
            Scan field sample slips, verify chain of custody, and record RT-PCR / ELISA findings.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AudioSpeakButton
            text="Diagnostic laboratory portal. Scan QR sample codes, verify cold-chain accession, and enter RT-PCR or ELISA diagnostic test results."
            variant="outline"
            label="Lab Overview"
          />
          <span className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold">
            <FlaskConical className="h-4 w-4 text-primary" />
            RDDL Pune Linked
          </span>
        </div>
      </div>

      {/* QR Search & Scan Simulation */}
      <div className="panel p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Scan or enter QR Token, Requisition Reference (e.g. DVDL/ERD/2026/4102), or Tag ID..."
              className="w-full rounded-md border border-input bg-card py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const sampleTokens = ["REQ-ERD-4102-TOK", "DVDL/ERD/2026/4102", "IN-TN-2031-4471"];
                const token = sampleTokens[Math.floor(Math.random() * sampleTokens.length)];
                setSearchQuery(token);
                toast.success(`Scanned QR Slip: ${token}`);
              }}
              className="inline-flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80"
            >
              <QrCode className="h-4 w-4" />
              Simulate Camera Scan
            </button>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="rounded-md border border-input px-3 py-2 text-xs font-medium hover:bg-accent"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Quick select pills */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="font-semibold">Recent Slips:</span>
          {(allRequisitions ?? []).slice(0, 4).map((r) => (
            <button
              key={r.id}
              onClick={() => setSearchQuery(r.scan_token)}
              className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs hover:border-primary hover:text-primary"
            >
              {r.reference} ({r.tag_id || "Herd"})
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Active Sample Intake & Result Entry Form */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 1 Col: Sample Intake Dossier */}
        <div className="panel p-5 lg:col-span-1">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-sm font-semibold">Sample Verification Card</h2>
              {activeRequisition && (
                <AudioSpeakButton
                  text={`Lab sample reference ${activeRequisition.reference}. Sample type: ${activeRequisition.sample_type}. Collected by ${activeRequisition.collected_by} from village ${activeRequisition.village}. Suspected disease: ${activeRequisition.suspected_disease}. Status: ${activeRequisition.status}.`}
                  variant="badge"
                  label="Sample Info"
                />
              )}
            </div>
            {activeRequisition && (
              <button
                onClick={() => setSelectedSlip(activeRequisition)}
                className="text-xs font-semibold text-primary hover:underline"
              >
                View QR Slip
              </button>
            )}
          </div>

          {activeRequisition ? (
            <div className="mt-4 space-y-4 text-xs">
              <div className="rounded-lg border border-border bg-surface p-3.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-foreground">{activeRequisition.reference}</span>
                  <StatusBadge status={activeRequisition.status} result={activeRequisition.result_status} />
                </div>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">Token: {activeRequisition.scan_token}</p>
              </div>

              <div className="space-y-2.5">
                <div className="flex justify-between border-b border-border pb-1.5">
                  <span className="text-muted-foreground">Ear Tag ID</span>
                  <span className="font-mono font-bold text-primary">{activeRequisition.tag_id || "Un-tagged"}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-1.5">
                  <span className="text-muted-foreground">Sample Specimen</span>
                  <span className="font-semibold text-foreground">{activeRequisition.sample_type}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-1.5">
                  <span className="text-muted-foreground">Testing Laboratory</span>
                  <span className="text-foreground">{activeRequisition.laboratory}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-1.5">
                  <span className="text-muted-foreground">Field Collector</span>
                  <span className="text-foreground">{activeRequisition.collected_by || "Para-vet"}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-1.5">
                  <span className="text-muted-foreground">Collection Date</span>
                  <span className="text-foreground">{new Date(activeRequisition.created_at).toLocaleString("en-IN")}</span>
                </div>
              </div>

              {activeRequisition.findings && (
                <div className="rounded-lg border border-border bg-muted/50 p-3">
                  <p className="font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Current Lab Finding</p>
                  <p className="mt-1 text-xs font-medium text-foreground">{activeRequisition.findings}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">Reported by: {activeRequisition.reported_by || "Lab Analyst"}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-8 text-center text-sm text-muted-foreground">
              No sample requisition found. Scan a QR code or pick an item from the list.
            </div>
          )}
        </div>

        {/* Right 2 Cols: Diagnostic Finding Entry */}
        <div className="panel p-5 lg:col-span-2">
          <div className="flex items-start justify-between border-b border-border pb-3">
            <div>
              <h2 className="font-display text-sm font-semibold">Record Diagnostic Test Findings</h2>
              <p className="text-xs text-muted-foreground">
                Official test entry automatically updates the case status on veterinary dashboards and containment rings.
              </p>
            </div>
            <AudioSpeakButton
              text="Diagnostic findings entry section. Enter test method such as RT-PCR or ELISA, pathogen identification, and mark positive, negative, or inconclusive outcome."
              variant="badge"
              label="Form Audio"
            />
          </div>

          <form onSubmit={handleUpdate} className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label-caps mb-1.5 block">Diagnostic Test Method</label>
                <select
                  value={diagnosticTest}
                  onChange={(e) => setDiagnosticTest(e.target.value)}
                  className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option>RT-qPCR (Reverse Transcription Quantitative PCR)</option>
                  <option>Antigen Capture ELISA (Solid Phase)</option>
                  <option>Rapid Lateral Flow Antigen Strip</option>
                  <option>Direct Fluorescent Antibody Test (DFAT)</option>
                  <option>Gram Staining & Culture Identification</option>
                </select>
              </div>

              <div>
                <label className="label-caps mb-1.5 block">Target Pathogen</label>
                <select
                  value={pathogen}
                  onChange={(e) => setPathogen(e.target.value)}
                  className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option>Foot-and-Mouth Disease Virus (FMDV - Serotype O)</option>
                  <option>Foot-and-Mouth Disease Virus (FMDV - Serotype A)</option>
                  <option>Foot-and-Mouth Disease Virus (FMDV - Serotype Asia-1)</option>
                  <option>Lumpy Skin Disease Virus (LSDV)</option>
                  <option>Brucella abortus</option>
                  <option>Bacillus anthracis (Anthrax)</option>
                  <option>Pasteurella multocida (Haemorrhagic Septicaemia)</option>
                  <option>Clostridium chauvoei (Black Quarter)</option>
                  <option>Negative / Pathogen Not Detected</option>
                </select>
              </div>
            </div>

            {/* Result Outcome Selector */}
            <div>
              <label className="label-caps mb-1.5 block">Diagnostic Outcome</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setResultStatus("positive");
                    setFindings("Positive amplification at Ct 21.4. VP1 capsid gene sequence indicates Serotype O lineage.");
                  }}
                  className={`flex flex-col items-center justify-center rounded-lg border p-3 text-center transition-colors ${
                    resultStatus === "positive"
                      ? "border-critical bg-critical/10 text-critical font-bold ring-2 ring-critical"
                      : "border-border bg-surface hover:bg-muted"
                  }`}
                >
                  <AlertOctagon className="h-5 w-5 mb-1 text-critical" />
                  <span className="text-sm">POSITIVE</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">Auto-escalates containment</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setResultStatus("negative");
                    setFindings("No viral RNA or bacterial pathogen detected. Negative across all primer sets.");
                  }}
                  className={`flex flex-col items-center justify-center rounded-lg border p-3 text-center transition-colors ${
                    resultStatus === "negative"
                      ? "border-low bg-low/10 text-low font-bold ring-2 ring-low"
                      : "border-border bg-surface hover:bg-muted"
                  }`}
                >
                  <CheckCircle2 className="h-5 w-5 mb-1 text-low" />
                  <span className="text-sm">NEGATIVE</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">Clears case status</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setResultStatus("inconclusive");
                    setFindings("Borderline amplification (Ct 38.2). Repeat sample collection recommended.");
                  }}
                  className={`flex flex-col items-center justify-center rounded-lg border p-3 text-center transition-colors ${
                    resultStatus === "inconclusive"
                      ? "border-medium bg-medium/10 text-medium font-bold ring-2 ring-medium"
                      : "border-border bg-surface hover:bg-muted"
                  }`}
                >
                  <ShieldAlert className="h-5 w-5 mb-1 text-medium" />
                  <span className="text-sm">INCONCLUSIVE</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">Requires re-sampling</span>
                </button>
              </div>
            </div>

            <div>
              <label className="label-caps mb-1.5 block">Detailed Findings & Molecular Observations</label>
              <textarea
                rows={3}
                value={findings}
                onChange={(e) => setFindings(e.target.value)}
                required
                className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="label-caps mb-1.5 block">Reporting Lab Officer & Designation</label>
              <input
                value={officerName}
                onChange={(e) => setOfficerName(e.target.value)}
                required
                className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={mutation.isPending || !activeRequisition}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                <FileCheck className="h-4 w-4" />
                {mutation.isPending ? "Submitting & Syncing..." : "Submit Lab Findings & Update Case"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Requisitions Overview Table */}
      <div className="panel p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-sm font-semibold">All Biological Requisitions in Transit & Processing</h2>
          <AudioSpeakButton
            text={`Biological requisitions overview. ${allRequisitions?.length ?? 0} sample slips in transit and processing across diagnostic laboratories.`}
            variant="badge"
            label="Read Table"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="pb-2">Reference</th>
                <th className="pb-2">Ear Tag</th>
                <th className="pb-2">Sample Specimen</th>
                <th className="pb-2">Target Lab</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Finding</th>
                <th className="pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(allRequisitions ?? []).map((req) => (
                <tr key={req.id} className="hover:bg-surface/50">
                  <td className="py-2.5 font-mono font-semibold">{req.reference}</td>
                  <td className="py-2.5 font-mono text-primary font-medium">{req.tag_id || "Herd"}</td>
                  <td className="py-2.5">{req.sample_type}</td>
                  <td className="py-2.5">{req.laboratory}</td>
                  <td className="py-2.5">
                    <StatusBadge status={req.status} result={req.result_status} />
                  </td>
                  <td className="py-2.5 max-w-[200px] truncate text-muted-foreground">
                    {req.pathogen ? `${req.pathogen} (${req.result_status})` : "Pending Analysis"}
                  </td>
                  <td className="py-2.5 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => setSearchQuery(req.scan_token)}
                      className="rounded border border-input bg-card px-2 py-1 text-[11px] font-semibold hover:bg-accent"
                    >
                      Process
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSlip(req)}
                      className="rounded border border-input bg-card px-2 py-1 text-[11px] font-semibold hover:bg-accent"
                    >
                      QR Slip
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* QR Slip Modal */}
      <LabSlipModal
        isOpen={!!selectedSlip}
        onClose={() => setSelectedSlip(null)}
        requisition={selectedSlip}
      />
    </div>
  );
}

function StatusBadge({ status, result }: { status: string; result?: string }) {
  if (result === "positive") {
    return (
      <span className="inline-flex items-center rounded-full bg-critical-soft px-2 py-0.5 text-[10px] font-bold text-critical">
        POSITIVE
      </span>
    );
  }
  if (result === "negative") {
    return (
      <span className="inline-flex items-center rounded-full bg-low-soft px-2 py-0.5 text-[10px] font-bold text-low">
        NEGATIVE
      </span>
    );
  }
  if (status === "completed") {
    return (
      <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">
        COMPLETED
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-medium-soft px-2 py-0.5 text-[10px] font-semibold text-medium">
      IN TRANSIT
    </span>
  );
}
