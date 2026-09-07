import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Link } from "@tanstack/react-router";
import { X, Printer, ExternalLink, ShieldCheck, QrCode } from "lucide-react";
import { toast } from "sonner";

interface LabSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  requisition: {
    id: string;
    reference: string;
    scan_token: string;
    tag_id?: string | null;
    alert_id?: string | null;
    sample_type: string;
    laboratory?: string;
    collected_by?: string | null;
    created_at?: string;
    owner_name?: string;
    village?: string;
    species?: string;
  } | null;
}

export function LabSlipModal({ isOpen, onClose, requisition }: LabSlipModalProps) {
  const [qrUrl, setQrUrl] = useState<string>("");

  useEffect(() => {
    if (requisition) {
      const verifyUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/lab?token=${requisition.scan_token || requisition.reference}`;
      QRCode.toDataURL(verifyUrl, { width: 220, margin: 1 })
        .then((url) => setQrUrl(url))
        .catch((err) => console.error("QR Code generation error:", err));
    }
  }, [requisition]);

  if (!isOpen || !requisition) return null;

  const printSlip = () => {
    window.print();
    toast.success("Printed requisition slip");
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-xl rounded-xl border border-border bg-card p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Official Header */}
        <div className="border-b border-border pb-4 text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
            DEPARTMENT OF ANIMAL HUSBANDRY & DAIRYING
          </p>
          <h2 className="font-display text-xl font-bold tracking-tight">
            Digital Lab Requisition Slip
          </h2>
          <p className="text-xs text-muted-foreground">
            District Veterinary Diagnostic Laboratory (DVDL), Erode · Government of Tamil Nadu
          </p>
        </div>

        {/* Body content */}
        <div className="mt-5 grid gap-5 sm:grid-cols-3">
          {/* QR Code and Reference */}
          <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-surface p-3 text-center sm:col-span-1">
            {qrUrl ? (
              <img
                src={qrUrl}
                alt="Requisition QR Code"
                className="h-36 w-36 rounded border border-border bg-white p-1"
              />
            ) : (
              <div className="flex h-36 w-36 items-center justify-center rounded bg-muted">
                <QrCode className="h-10 w-10 text-muted-foreground animate-pulse" />
              </div>
            )}
            <p className="mt-2 text-[10px] font-mono font-semibold tracking-wider text-muted-foreground">
              {requisition.scan_token || "SCAN-FOR-LAB"}
            </p>
            <span className="mt-1 rounded-full bg-secondary px-2 py-0.5 text-[9px] font-semibold text-secondary-foreground">
              CHAIN OF CUSTODY VERIFIED
            </span>
          </div>

          {/* Details Table */}
          <div className="space-y-2.5 sm:col-span-2 text-xs">
            <div className="flex justify-between border-b border-border pb-1">
              <span className="font-semibold text-muted-foreground">Requisition Ref:</span>
              <span className="font-mono font-bold text-foreground">{requisition.reference}</span>
            </div>
            <div className="flex justify-between border-b border-border pb-1">
              <span className="font-semibold text-muted-foreground">Animal Tag ID:</span>
              <span className="font-mono font-bold text-primary">{requisition.tag_id || "Herd-Level Sample"}</span>
            </div>
            {requisition.owner_name && (
              <div className="flex justify-between border-b border-border pb-1">
                <span className="font-semibold text-muted-foreground">Livestock Owner:</span>
                <span className="text-foreground">{requisition.owner_name} ({requisition.village || "Gobichettipalayam"})</span>
              </div>
            )}
            <div className="flex justify-between border-b border-border pb-1">
              <span className="font-semibold text-muted-foreground">Sample Type:</span>
              <span className="font-medium text-foreground">{requisition.sample_type}</span>
            </div>
            <div className="flex justify-between border-b border-border pb-1">
              <span className="font-semibold text-muted-foreground">Target Diagnostic Lab:</span>
              <span className="text-foreground">{requisition.laboratory || "RDDL Pune"}</span>
            </div>
            <div className="flex justify-between border-b border-border pb-1">
              <span className="font-semibold text-muted-foreground">Collecting Officer:</span>
              <span className="text-foreground">{requisition.collected_by || "Dr. Suresh Patil (BVO)"}</span>
            </div>
            <div className="flex justify-between border-b border-border pb-1">
              <span className="font-semibold text-muted-foreground">Issue Date:</span>
              <span className="text-foreground">{new Date(requisition.created_at || Date.now()).toLocaleDateString("en-IN")}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
          <Link
            to="/lab"
            search={{ token: requisition.scan_token || requisition.reference }}
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-card px-3 py-2 text-xs font-semibold hover:bg-accent"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open in Lab Portal
          </Link>
          <button
            type="button"
            onClick={printSlip}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Printer className="h-3.5 w-3.5" />
            Print Requisition
          </button>
        </div>
      </div>
    </div>
  );
}
